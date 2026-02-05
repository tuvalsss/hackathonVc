// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAutoSentinel
 * @notice Interface for the AutoSentinel contract
 */
interface IAutoSentinel {
    struct SentinelState {
        uint256 timestamp;
        uint256 priceETH;
        uint256 priceBTC;
        uint256 aggregatedScore;
        bool thresholdTriggered;
        string decisionReason;
    }

    // Events
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

    // External functions
    function updateSentinelState(
        uint256 _priceETH,
        uint256 _priceBTC,
        uint256 _aggregatedScore,
        bool _thresholdTriggered,
        string calldata _decisionReason
    ) external;

    function getLatestState() external view returns (SentinelState memory);
    function getStateHistory(uint256 count) external view returns (SentinelState[] memory);
    function getHistoryLength() external view returns (uint256);
    function getStatistics() external view returns (
        uint256 _totalUpdates,
        uint256 _totalThresholdTriggers,
        uint256 _currentThreshold,
        uint256 _lastUpdateTime
    );
    function isAuthorized(address caller) external view returns (bool);
    function timeUntilNextUpdate() external view returns (uint256);
}
