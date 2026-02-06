// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title AutoSentinelFunctions
 * @notice Autonomous Market Intelligence Engine powered by Chainlink Functions
 */
contract AutoSentinelFunctions is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    string public sourceCode;
    
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
    
    struct SentinelState {
        uint256 timestamp;
        uint256 priceETH;
        uint256 priceBTC;
        uint256 aggregatedScore;
        bool thresholdTriggered;
        string decisionReason;
        string dataSources;
        bytes32 requestId;
    }
    
    SentinelState public currentState;
    SentinelState[] public stateHistory;
    
    uint256 public threshold = 75;
    uint256 public totalUpdates;
    uint256 public totalThresholdTriggers;
    
    event RequestSent(bytes32 indexed requestId, address indexed requester, uint256 timestamp);
    event RequestFulfilled(bytes32 indexed requestId, bytes response, bytes err, uint256 timestamp);
    event StateUpdated(bytes32 indexed requestId, uint256 timestamp, uint256 priceETH, uint256 priceBTC, uint256 aggregatedScore, bool thresholdTriggered, string dataSources);
    event ThresholdTriggered(bytes32 indexed requestId, uint256 timestamp, string reason, uint256 score);
    event ConfigurationUpdated(bytes32 donId, uint64 subscriptionId, uint32 gasLimit);
    event SourceCodeUpdated(uint256 timestamp);

    error UnexpectedRequestID(bytes32 requestId);
    error RequestNotFound(bytes32 requestId);

    constructor(address router) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        sourceCode = _getDefaultSourceCode();
    }

    function sendRequest() external returns (bytes32 requestId) {
        require(bytes(sourceCode).length > 0, "Source code not set");
        require(subscriptionId > 0, "Subscription ID not set");
        
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);
        
        string[] memory args = new string[](1);
        args[0] = _uint2str(threshold);
        req.setArgs(args);
        
        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        
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

    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        if (!requests[requestId].exists) {
            revert UnexpectedRequestID(requestId);
        }
        
        requests[requestId].fulfilled = true;
        requests[requestId].response = response;
        requests[requestId].err = err;
        
        emit RequestFulfilled(requestId, response, err, block.timestamp);
        
        if (err.length == 0 && response.length > 0) {
            _processResponse(requestId, response);
        }
    }

    function _processResponse(bytes32 requestId, bytes memory response) internal {
        // Response is a JSON string, parse manually
        string memory jsonStr = string(response);
        
        // Simple parsing for demo - extract values from JSON
        uint256 priceETH = _extractUint(jsonStr, "priceETH");
        uint256 priceBTC = _extractUint(jsonStr, "priceBTC");
        uint256 score = _extractUint(jsonStr, "score");
        bool triggered = _extractBool(jsonStr, "triggered");
        string memory reason = _extractString(jsonStr, "reason");
        string memory sources = _extractString(jsonStr, "sources");
        
        if (currentState.timestamp > 0) {
            stateHistory.push(currentState);
        }
        
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
        
        emit StateUpdated(requestId, block.timestamp, priceETH, priceBTC, score, triggered, sources);
        
        if (triggered) {
            totalThresholdTriggers++;
            emit ThresholdTriggered(requestId, block.timestamp, reason, score);
        }
    }
    
    // Simple JSON parsing helpers for demo
    function _extractUint(string memory json, string memory key) internal pure returns (uint256) {
        bytes memory jsonBytes = bytes(json);
        bytes memory keyBytes = bytes(key);
        
        for (uint i = 0; i < jsonBytes.length - keyBytes.length; i++) {
            bool found = true;
            for (uint j = 0; j < keyBytes.length && found; j++) {
                if (jsonBytes[i + j] != keyBytes[j]) found = false;
            }
            if (found) {
                // Find the colon and extract number
                uint start = i + keyBytes.length;
                while (start < jsonBytes.length && jsonBytes[start] != 0x3A) start++; // ':'
                start++;
                while (start < jsonBytes.length && jsonBytes[start] == 0x20) start++; // space
                
                uint end = start;
                while (end < jsonBytes.length && jsonBytes[end] >= 0x30 && jsonBytes[end] <= 0x39) end++;
                
                uint256 result = 0;
                for (uint k = start; k < end; k++) {
                    result = result * 10 + uint8(jsonBytes[k]) - 48;
                }
                return result;
            }
        }
        return 0;
    }
    
    function _extractBool(string memory json, string memory key) internal pure returns (bool) {
        bytes memory jsonBytes = bytes(json);
        bytes memory keyBytes = bytes(key);
        
        for (uint i = 0; i < jsonBytes.length - keyBytes.length; i++) {
            bool found = true;
            for (uint j = 0; j < keyBytes.length && found; j++) {
                if (jsonBytes[i + j] != keyBytes[j]) found = false;
            }
            if (found) {
                uint start = i + keyBytes.length;
                while (start < jsonBytes.length && jsonBytes[start] != 0x3A) start++;
                start++;
                while (start < jsonBytes.length && jsonBytes[start] == 0x20) start++;
                
                if (start + 4 <= jsonBytes.length &&
                    jsonBytes[start] == 0x74 && // t
                    jsonBytes[start+1] == 0x72 && // r
                    jsonBytes[start+2] == 0x75 && // u
                    jsonBytes[start+3] == 0x65) { // e
                    return true;
                }
                return false;
            }
        }
        return false;
    }
    
    function _extractString(string memory json, string memory key) internal pure returns (string memory) {
        bytes memory jsonBytes = bytes(json);
        bytes memory keyBytes = bytes(key);
        
        for (uint i = 0; i < jsonBytes.length - keyBytes.length; i++) {
            bool found = true;
            for (uint j = 0; j < keyBytes.length && found; j++) {
                if (jsonBytes[i + j] != keyBytes[j]) found = false;
            }
            if (found) {
                uint start = i + keyBytes.length;
                while (start < jsonBytes.length && jsonBytes[start] != 0x22) start++; // "
                start++;
                
                uint end = start;
                while (end < jsonBytes.length && jsonBytes[end] != 0x22) end++;
                
                bytes memory result = new bytes(end - start);
                for (uint k = start; k < end; k++) {
                    result[k - start] = jsonBytes[k];
                }
                return string(result);
            }
        }
        return "";
    }

    function getLatestState() external view returns (SentinelState memory) {
        return currentState;
    }
    
    function getStateHistory(uint256 count) external view returns (SentinelState[] memory) {
        uint256 length = stateHistory.length;
        uint256 resultCount = count > length ? length : count;
        
        SentinelState[] memory result = new SentinelState[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = stateHistory[length - resultCount + i];
        }
        return result;
    }
    
    function getRequestStatus(bytes32 requestId) external view returns (RequestStatus memory) {
        if (!requests[requestId].exists) {
            revert RequestNotFound(requestId);
        }
        return requests[requestId];
    }
    
    function getRecentRequests(uint256 count) external view returns (bytes32[] memory) {
        uint256 length = requestHistory.length;
        uint256 resultCount = count > length ? length : count;
        
        bytes32[] memory result = new bytes32[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = requestHistory[length - resultCount + i];
        }
        return result;
    }
    
    function getStatistics() external view returns (
        uint256 _totalUpdates,
        uint256 _totalThresholdTriggers,
        uint256 _totalRequests,
        uint256 _currentThreshold,
        uint256 _lastUpdateTime,
        bytes32 _lastRequestId
    ) {
        return (totalUpdates, totalThresholdTriggers, requestHistory.length, threshold, currentState.timestamp, lastRequestId);
    }

    function setConfig(bytes32 _donId, uint64 _subscriptionId, uint32 _gasLimit) external onlyOwner {
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        emit ConfigurationUpdated(_donId, _subscriptionId, _gasLimit);
    }
    
    function setSourceCode(string memory _sourceCode) external onlyOwner {
        require(bytes(_sourceCode).length > 0, "Empty source code");
        sourceCode = _sourceCode;
        emit SourceCodeUpdated(block.timestamp);
    }
    
    function setThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 100, "Threshold must be 0-100");
        threshold = _threshold;
    }

    function _getDefaultSourceCode() internal pure returns (string memory) {
        return 'return Functions.encodeString(JSON.stringify({priceETH:280000000000,priceBTC:9500000000000,score:80,triggered:true,reason:"Demo",sources:"DON"}));';
    }
    
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
