// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title AutoSentinelV3
 * @notice Ultra-lightweight callback. All parsing done offchain/in view functions.
 */
contract AutoSentinelFunctions is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    string public sourceCode;
    uint256 public threshold = 75;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;
    uint256 public s_lastTimestamp;
    uint256 public totalRequests;
    uint256 public totalFulfilled;

    mapping(bytes32 => bool) private s_requestExists;
    mapping(bytes32 => bool) private s_requestFulfilled;

    event RequestSent(bytes32 indexed requestId, address indexed requester, uint256 timestamp);
    event Response(bytes32 indexed requestId, bytes response, bytes err);

    constructor(address router) FunctionsClient(router) ConfirmedOwner(msg.sender) {}

    function sendRequest() external returns (bytes32 requestId) {
        require(bytes(sourceCode).length > 0, "No source");
        require(subscriptionId > 0, "No sub");

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);
        string[] memory args = new string[](1);
        args[0] = _uint2str(threshold);
        req.setArgs(args);

        s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        s_requestExists[s_lastRequestId] = true;
        totalRequests++;

        emit RequestSent(s_lastRequestId, msg.sender, block.timestamp);
        return s_lastRequestId;
    }

    // ULTRA MINIMAL callback - just store raw bytes, nothing else
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        s_requestFulfilled[requestId] = true;
        s_lastResponse = response;
        s_lastError = err;
        s_lastTimestamp = block.timestamp;
        totalFulfilled++;
        emit Response(requestId, response, err);
    }

    // All parsing happens in VIEW functions (free, no gas)
    function getLatestState() external view returns (
        uint256 timestamp,
        uint256 priceETH,
        uint256 priceBTC,
        uint256 aggregatedScore,
        bool thresholdTriggered,
        string memory decisionReason,
        string memory dataSources,
        bytes32 requestId
    ) {
        if (s_lastResponse.length == 0) {
            return (0, 0, 0, 0, false, "", "", s_lastRequestId);
        }
        string memory data = string(s_lastResponse);
        uint256 eth = _parseNum(data, "priceETH:");
        uint256 btc = _parseNum(data, "priceBTC:");
        uint256 score = _parseNum(data, "score:");
        uint256 trig = _parseNum(data, "triggered:");
        string memory reason = _parseStr(data, "reason:", ",");
        string memory sources = _parseStr(data, "sources:", "");

        return (s_lastTimestamp, eth, btc, score, trig == 1, reason, sources, s_lastRequestId);
    }

    function getRequestStatus(bytes32 requestId) external view returns (
        bool exists,
        bool fulfilled,
        bytes memory response,
        bytes memory err,
        uint256 timestamp
    ) {
        return (
            s_requestExists[requestId],
            s_requestFulfilled[requestId],
            s_requestFulfilled[requestId] ? s_lastResponse : bytes(""),
            s_requestFulfilled[requestId] ? s_lastError : bytes(""),
            s_requestFulfilled[requestId] ? s_lastTimestamp : 0
        );
    }

    function getStatistics() external view returns (
        uint256 _totalUpdates,
        uint256 _totalThresholdTriggers,
        uint256 _totalRequests,
        uint256 _currentThreshold,
        uint256 _lastUpdateTime,
        bytes32 _lastRequestId
    ) {
        return (totalFulfilled, 0, totalRequests, threshold, s_lastTimestamp, s_lastRequestId);
    }

    // Config
    function setConfig(bytes32 _donId, uint64 _subscriptionId, uint32 _gasLimit) external onlyOwner {
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
    }

    function setSourceCode(string memory _src) external onlyOwner {
        sourceCode = _src;
    }

    function setThreshold(uint256 _t) external onlyOwner {
        threshold = _t;
    }

    // Pure parsing helpers (only used in view functions - zero gas cost)
    function _parseNum(string memory data, string memory key) internal pure returns (uint256) {
        bytes memory d = bytes(data);
        bytes memory k = bytes(key);
        for (uint256 i = 0; i + k.length <= d.length; i++) {
            bool m = true;
            for (uint256 j = 0; j < k.length; j++) {
                if (d[i+j] != k[j]) { m = false; break; }
            }
            if (m) {
                uint256 s = i + k.length;
                uint256 r = 0;
                while (s < d.length && d[s] >= 0x30 && d[s] <= 0x39) {
                    r = r * 10 + uint8(d[s]) - 48;
                    s++;
                }
                return r;
            }
        }
        return 0;
    }

    function _parseStr(string memory data, string memory key, string memory delim) internal pure returns (string memory) {
        bytes memory d = bytes(data);
        bytes memory k = bytes(key);
        for (uint256 i = 0; i + k.length <= d.length; i++) {
            bool m = true;
            for (uint256 j = 0; j < k.length; j++) {
                if (d[i+j] != k[j]) { m = false; break; }
            }
            if (m) {
                uint256 s = i + k.length;
                uint256 e = s;
                bytes memory dl = bytes(delim);
                if (dl.length > 0) {
                    while (e < d.length && d[e] != dl[0]) e++;
                } else {
                    e = d.length;
                }
                bytes memory res = new bytes(e - s);
                for (uint256 x = s; x < e; x++) res[x-s] = d[x];
                return string(res);
            }
        }
        return "";
    }

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 t = v; uint256 l;
        while (t != 0) { l++; t /= 10; }
        bytes memory b = new bytes(l);
        t = v;
        while (t != 0) { b[--l] = bytes1(uint8(48 + t % 10)); t /= 10; }
        return string(b);
    }
}
