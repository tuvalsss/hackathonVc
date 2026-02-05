// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AutoSentinel
 * @notice Autonomous Market Intelligence Engine - Stores decision states triggered by CRE
 * @dev Part of the Chainlink Hackathon submission demonstrating CRE workflow capabilities
 */
contract AutoSentinel {
    // ============ Structs ============

    struct SentinelState {
        uint256 timestamp;
        uint256 priceETH;      // Price in USD with 8 decimals (e.g., 245032000000 = $2450.32)
        uint256 priceBTC;      // Price in USD with 8 decimals
        uint256 aggregatedScore; // Decision score 0-100
        bool thresholdTriggered;
        string decisionReason;
    }

    // ============ State Variables ============

    address public owner;
    mapping(address => bool) public authorizedCallers;
    
    SentinelState public currentState;
    SentinelState[] public stateHistory;
    
    uint256 public constant MIN_UPDATE_INTERVAL = 60; // Minimum 60 seconds between updates
    uint256 public threshold = 75; // Default threshold for triggering (0-100)
    
    uint256 public totalUpdates;
    uint256 public totalThresholdTriggers;

    // ============ Events ============

    event StateUpdated(
        uint256 indexed timestamp,
        uint256 priceETH,
        uint256 priceBTC,
        uint256 aggregatedScore,
        bool thresholdTriggered
    );

    event ThresholdTriggered(
        uint256 indexed timestamp,
        string reason,
        uint256 score
    );

    event AuthorizedCallerUpdated(address indexed caller, bool authorized);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == owner, "AutoSentinel: caller is not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedCallers[msg.sender] || msg.sender == owner,
            "AutoSentinel: caller is not authorized"
        );
        _;
    }

    modifier rateLimited() {
        require(
            currentState.timestamp == 0 || 
            block.timestamp >= currentState.timestamp + MIN_UPDATE_INTERVAL,
            "AutoSentinel: update too frequent"
        );
        _;
    }

    // ============ Constructor ============

    constructor() {
        owner = msg.sender;
        authorizedCallers[msg.sender] = true;
        
        emit OwnershipTransferred(address(0), msg.sender);
        emit AuthorizedCallerUpdated(msg.sender, true);
    }

    // ============ External Functions ============

    /**
     * @notice Updates the sentinel state with new market data and decision
     * @dev Called by CRE workflow after off-chain computation
     * @param _priceETH ETH price in USD with 8 decimals
     * @param _priceBTC BTC price in USD with 8 decimals
     * @param _aggregatedScore Computed decision score (0-100)
     * @param _thresholdTriggered Whether the threshold was exceeded
     * @param _decisionReason Human-readable reason for the decision
     */
    function updateSentinelState(
        uint256 _priceETH,
        uint256 _priceBTC,
        uint256 _aggregatedScore,
        bool _thresholdTriggered,
        string calldata _decisionReason
    ) external onlyAuthorized rateLimited {
        // Input validation
        require(_priceETH > 0, "AutoSentinel: invalid ETH price");
        require(_priceBTC > 0, "AutoSentinel: invalid BTC price");
        require(_aggregatedScore <= 100, "AutoSentinel: score must be 0-100");

        // Store previous state in history if exists
        if (currentState.timestamp > 0) {
            stateHistory.push(currentState);
        }

        // Update current state
        currentState = SentinelState({
            timestamp: block.timestamp,
            priceETH: _priceETH,
            priceBTC: _priceBTC,
            aggregatedScore: _aggregatedScore,
            thresholdTriggered: _thresholdTriggered,
            decisionReason: _decisionReason
        });

        totalUpdates++;

        // Emit state update event
        emit StateUpdated(
            block.timestamp,
            _priceETH,
            _priceBTC,
            _aggregatedScore,
            _thresholdTriggered
        );

        // Emit threshold trigger event if applicable
        if (_thresholdTriggered) {
            totalThresholdTriggers++;
            emit ThresholdTriggered(
                block.timestamp,
                _decisionReason,
                _aggregatedScore
            );
        }
    }

    /**
     * @notice Returns the current sentinel state
     * @return The latest SentinelState struct
     */
    function getLatestState() external view returns (SentinelState memory) {
        return currentState;
    }

    /**
     * @notice Returns recent state history
     * @param count Number of historical states to return
     * @return Array of SentinelState structs
     */
    function getStateHistory(uint256 count) external view returns (SentinelState[] memory) {
        uint256 historyLength = stateHistory.length;
        uint256 resultCount = count > historyLength ? historyLength : count;
        
        SentinelState[] memory result = new SentinelState[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = stateHistory[historyLength - resultCount + i];
        }
        
        return result;
    }

    /**
     * @notice Returns the total number of historical states
     * @return Length of state history array
     */
    function getHistoryLength() external view returns (uint256) {
        return stateHistory.length;
    }

    /**
     * @notice Returns contract statistics
     * @return _totalUpdates Total number of state updates
     * @return _totalThresholdTriggers Total number of threshold triggers
     * @return _currentThreshold Current threshold value
     * @return _lastUpdateTime Timestamp of last update
     */
    function getStatistics() external view returns (
        uint256 _totalUpdates,
        uint256 _totalThresholdTriggers,
        uint256 _currentThreshold,
        uint256 _lastUpdateTime
    ) {
        return (
            totalUpdates,
            totalThresholdTriggers,
            threshold,
            currentState.timestamp
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Sets or revokes authorization for an address to update state
     * @param caller Address to authorize/deauthorize
     * @param authorized Whether the address should be authorized
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        require(caller != address(0), "AutoSentinel: invalid address");
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }

    /**
     * @notice Updates the decision threshold
     * @param _newThreshold New threshold value (0-100)
     */
    function setThreshold(uint256 _newThreshold) external onlyOwner {
        require(_newThreshold <= 100, "AutoSentinel: threshold must be 0-100");
        uint256 oldThreshold = threshold;
        threshold = _newThreshold;
        emit ThresholdUpdated(oldThreshold, _newThreshold);
    }

    /**
     * @notice Transfers ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AutoSentinel: invalid new owner");
        address oldOwner = owner;
        owner = newOwner;
        authorizedCallers[newOwner] = true;
        emit OwnershipTransferred(oldOwner, newOwner);
        emit AuthorizedCallerUpdated(newOwner, true);
    }

    // ============ Helper Functions ============

    /**
     * @notice Checks if an address is authorized to update state
     * @param caller Address to check
     * @return Whether the address is authorized
     */
    function isAuthorized(address caller) external view returns (bool) {
        return authorizedCallers[caller] || caller == owner;
    }

    /**
     * @notice Returns time until next update is allowed
     * @return Seconds until next update (0 if update is allowed now)
     */
    function timeUntilNextUpdate() external view returns (uint256) {
        if (currentState.timestamp == 0) {
            return 0;
        }
        
        uint256 nextUpdateTime = currentState.timestamp + MIN_UPDATE_INTERVAL;
        if (block.timestamp >= nextUpdateTime) {
            return 0;
        }
        
        return nextUpdateTime - block.timestamp;
    }
}
