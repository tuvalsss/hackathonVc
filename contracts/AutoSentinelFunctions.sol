// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title AutoSentinelFunctions
 * @notice Autonomous Market Intelligence Engine powered by Chainlink Functions
 * @dev Demonstrates meaningful use of Chainlink Runtime Environment (CRE) for
 *      off-chain computation with on-chain verified execution
 * 
 * Architecture:
 * 1. User triggers sendRequest() to initiate workflow
 * 2. Chainlink DON executes JavaScript source code off-chain
 * 3. DON fetches data from CoinGecko + CoinCap APIs
 * 4. DON computes decision score and aggregates data
 * 5. DON returns result via fulfillRequest() callback
 * 6. Contract stores verified result on-chain
 */
contract AutoSentinelFunctions is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // ============ Chainlink Functions Configuration ============
    
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    
    // JavaScript source code executed by Chainlink DON
    string public sourceCode;
    
    // ============ Request Tracking ============
    
    struct RequestStatus {
        bool exists;
        bool fulfilled;
        bytes response;
        bytes err;
        uint256 timestamp;
        address requester;
    }
    
    mapping(bytes32 => RequestStatus) public requests;
    bytes32 public lastRequestId;
    bytes32[] public requestHistory;
    
    // ============ Sentinel State ============
    
    struct SentinelState {
        uint256 timestamp;
        uint256 priceETH;         // Price in USD with 8 decimals
        uint256 priceBTC;         // Price in USD with 8 decimals  
        uint256 aggregatedScore;  // Decision score 0-100
        bool thresholdTriggered;
        string decisionReason;
        string dataSources;       // Sources used: "CoinGecko,CoinCap"
        bytes32 requestId;        // Chainlink Functions request ID
    }
    
    SentinelState public currentState;
    SentinelState[] public stateHistory;
    
    uint256 public threshold = 75;
    uint256 public totalUpdates;
    uint256 public totalThresholdTriggers;
    
    // ============ Events ============
    
    event RequestSent(
        bytes32 indexed requestId,
        address indexed requester,
        uint256 timestamp
    );
    
    event RequestFulfilled(
        bytes32 indexed requestId,
        bytes response,
        bytes err,
        uint256 timestamp
    );
    
    event StateUpdated(
        bytes32 indexed requestId,
        uint256 timestamp,
        uint256 priceETH,
        uint256 priceBTC,
        uint256 aggregatedScore,
        bool thresholdTriggered,
        string dataSources
    );
    
    event ThresholdTriggered(
        bytes32 indexed requestId,
        uint256 timestamp,
        string reason,
        uint256 score
    );
    
    event ConfigurationUpdated(
        bytes32 donId,
        uint64 subscriptionId,
        uint32 gasLimit
    );
    
    event SourceCodeUpdated(uint256 timestamp);

    // ============ Errors ============
    
    error UnexpectedRequestID(bytes32 requestId);
    error RequestNotFound(bytes32 requestId);
    error InvalidResponse();

    // ============ Constructor ============
    
    /**
     * @notice Initialize the contract with Chainlink Functions router
     * @param router Chainlink Functions router address for the network
     */
    constructor(address router) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        // Default source code - can be updated by owner
        sourceCode = _getDefaultSourceCode();
    }

    // ============ Chainlink Functions Request ============
    
    /**
     * @notice Send a request to Chainlink Functions to fetch market data
     * @dev This initiates the CRE workflow:
     *      1. Request sent to Chainlink DON
     *      2. DON executes sourceCode off-chain
     *      3. DON calls fulfillRequest with result
     * @return requestId The ID of the Chainlink Functions request
     */
    function sendRequest() external returns (bytes32 requestId) {
        require(bytes(sourceCode).length > 0, "Source code not set");
        require(subscriptionId > 0, "Subscription ID not set");
        
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);
        
        // Add threshold as argument for decision logic
        string[] memory args = new string[](1);
        args[0] = _uint2str(threshold);
        req.setArgs(args);
        
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        requests[requestId] = RequestStatus({
            exists: true,
            fulfilled: false,
            response: "",
            err: "",
            timestamp: block.timestamp,
            requester: msg.sender
        });
        
        lastRequestId = requestId;
        requestHistory.push(requestId);
        
        emit RequestSent(requestId, msg.sender, block.timestamp);
        
        return requestId;
    }

    // ============ Chainlink Functions Callback ============
    
    /**
     * @notice Callback function called by Chainlink DON with the result
     * @dev This is where off-chain computation result becomes on-chain state
     * @param requestId The request ID returned by sendRequest
     * @param response The response bytes from the DON
     * @param err Any error bytes from the DON
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (!requests[requestId].exists) {
            revert UnexpectedRequestID(requestId);
        }
        
        requests[requestId].fulfilled = true;
        requests[requestId].response = response;
        requests[requestId].err = err;
        
        emit RequestFulfilled(requestId, response, err, block.timestamp);
        
        // Parse and store result if no error
        if (err.length == 0 && response.length > 0) {
            _processResponse(requestId, response);
        }
    }

    // ============ Response Processing ============
    
    /**
     * @notice Process the response from Chainlink Functions
     * @dev Decodes the response and updates on-chain state
     * @param requestId The request ID
     * @param response The encoded response data
     */
    function _processResponse(bytes32 requestId, bytes memory response) internal {
        // Response format: abi.encode(priceETH, priceBTC, score, triggered, reason, sources)
        (
            uint256 priceETH,
            uint256 priceBTC,
            uint256 score,
            bool triggered,
            string memory reason,
            string memory sources
        ) = abi.decode(response, (uint256, uint256, uint256, bool, string, string));
        
        // Store previous state in history
        if (currentState.timestamp > 0) {
            stateHistory.push(currentState);
        }
        
        // Update current state
        currentState = SentinelState({
            timestamp: block.timestamp,
            priceETH: priceETH,
            priceBTC: priceBTC,
            aggregatedScore: score,
            thresholdTriggered: triggered,
            decisionReason: reason,
            dataSources: sources,
            requestId: requestId
        });
        
        totalUpdates++;
        
        emit StateUpdated(
            requestId,
            block.timestamp,
            priceETH,
            priceBTC,
            score,
            triggered,
            sources
        );
        
        if (triggered) {
            totalThresholdTriggers++;
            emit ThresholdTriggered(requestId, block.timestamp, reason, score);
        }
    }

    // ============ View Functions ============
    
    /**
     * @notice Get the current sentinel state
     * @return The latest SentinelState
     */
    function getLatestState() external view returns (SentinelState memory) {
        return currentState;
    }
    
    /**
     * @notice Get recent state history
     * @param count Number of states to return
     * @return Array of SentinelState
     */
    function getStateHistory(uint256 count) external view returns (SentinelState[] memory) {
        uint256 length = stateHistory.length;
        uint256 resultCount = count > length ? length : count;
        
        SentinelState[] memory result = new SentinelState[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = stateHistory[length - resultCount + i];
        }
        return result;
    }
    
    /**
     * @notice Get request status by ID
     * @param requestId The request ID to query
     * @return The RequestStatus struct
     */
    function getRequestStatus(bytes32 requestId) external view returns (RequestStatus memory) {
        if (!requests[requestId].exists) {
            revert RequestNotFound(requestId);
        }
        return requests[requestId];
    }
    
    /**
     * @notice Get recent request IDs
     * @param count Number of request IDs to return
     * @return Array of request IDs
     */
    function getRecentRequests(uint256 count) external view returns (bytes32[] memory) {
        uint256 length = requestHistory.length;
        uint256 resultCount = count > length ? length : count;
        
        bytes32[] memory result = new bytes32[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = requestHistory[length - resultCount + i];
        }
        return result;
    }
    
    /**
     * @notice Get contract statistics
     */
    function getStatistics() external view returns (
        uint256 _totalUpdates,
        uint256 _totalThresholdTriggers,
        uint256 _totalRequests,
        uint256 _currentThreshold,
        uint256 _lastUpdateTime,
        bytes32 _lastRequestId
    ) {
        return (
            totalUpdates,
            totalThresholdTriggers,
            requestHistory.length,
            threshold,
            currentState.timestamp,
            lastRequestId
        );
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Update Chainlink Functions configuration
     * @param _donId The DON ID for the network
     * @param _subscriptionId The Functions subscription ID
     * @param _gasLimit Gas limit for callback
     */
    function setConfig(
        bytes32 _donId,
        uint64 _subscriptionId,
        uint32 _gasLimit
    ) external onlyOwner {
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        
        emit ConfigurationUpdated(_donId, _subscriptionId, _gasLimit);
    }
    
    /**
     * @notice Update the JavaScript source code
     * @param _sourceCode New source code
     */
    function setSourceCode(string memory _sourceCode) external onlyOwner {
        require(bytes(_sourceCode).length > 0, "Empty source code");
        sourceCode = _sourceCode;
        emit SourceCodeUpdated(block.timestamp);
    }
    
    /**
     * @notice Update the decision threshold
     * @param _threshold New threshold (0-100)
     */
    function setThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 100, "Threshold must be 0-100");
        threshold = _threshold;
    }

    // ============ Internal Functions ============
    
    /**
     * @notice Get default JavaScript source code for Chainlink Functions
     * @dev This code runs on the Chainlink DON
     */
    function _getDefaultSourceCode() internal pure returns (string memory) {
        return
            'const threshold = parseInt(args[0]) || 75;'
            'const [geckoRes, capRes] = await Promise.all(['
            '  Functions.makeHttpRequest({ url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true" }),'
            '  Functions.makeHttpRequest({ url: "https://api.coincap.io/v2/assets?ids=ethereum,bitcoin" })'
            ']);'
            'let ethGecko = 0, btcGecko = 0, ethCap = 0, btcCap = 0;'
            'let sources = [];'
            'if (!geckoRes.error && geckoRes.data) {'
            '  ethGecko = geckoRes.data.ethereum?.usd || 0;'
            '  btcGecko = geckoRes.data.bitcoin?.usd || 0;'
            '  if (ethGecko > 0) sources.push("CoinGecko");'
            '}'
            'if (!capRes.error && capRes.data?.data) {'
            '  const eth = capRes.data.data.find(a => a.id === "ethereum");'
            '  const btc = capRes.data.data.find(a => a.id === "bitcoin");'
            '  ethCap = eth ? parseFloat(eth.priceUsd) : 0;'
            '  btcCap = btc ? parseFloat(btc.priceUsd) : 0;'
            '  if (ethCap > 0) sources.push("CoinCap");'
            '}'
            'const avgEth = (ethGecko + ethCap) / (ethGecko > 0 && ethCap > 0 ? 2 : 1);'
            'const avgBtc = (btcGecko + btcCap) / (btcGecko > 0 && btcCap > 0 ? 2 : 1);'
            'const ethDev = ethGecko > 0 && ethCap > 0 ? Math.abs(ethGecko - ethCap) / Math.min(ethGecko, ethCap) * 100 : 0;'
            'let score = 50;'
            'let reasons = [];'
            'if (ethDev > 1) { score += 20; reasons.push("High deviation: " + ethDev.toFixed(2) + "%"); }'
            'if (sources.length >= 2) { score += 15; reasons.push("Multi-source verified"); }'
            'score = Math.min(score, 100);'
            'const triggered = score >= threshold;'
            'if (triggered) reasons.push("Threshold exceeded");'
            'const reason = reasons.join("; ") || "Normal conditions";'
            'const priceETH = Math.round(avgEth * 1e8);'
            'const priceBTC = Math.round(avgBtc * 1e8);'
            'return Functions.encodeString('
            '  JSON.stringify({ priceETH, priceBTC, score, triggered, reason, sources: sources.join(",") })'
            ');';
    }
    
    /**
     * @notice Convert uint to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) { length++; j /= 10; }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) { bstr[--k] = bytes1(uint8(48 + j % 10)); j /= 10; }
        return string(bstr);
    }
}
