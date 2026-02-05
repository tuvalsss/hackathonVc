import { expect } from "chai";
import { ethers } from "hardhat";
import { AutoSentinel } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AutoSentinel", function () {
  let autoSentinel: AutoSentinel;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Sample test data
  const PRICE_ETH = ethers.parseUnits("2450.32", 8); // $2450.32 with 8 decimals
  const PRICE_BTC = ethers.parseUnits("43210.00", 8); // $43210.00 with 8 decimals
  const SCORE = 82n;
  const REASON = "Initial state update; High source deviation";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const AutoSentinelFactory = await ethers.getContractFactory("AutoSentinel");
    autoSentinel = await AutoSentinelFactory.deploy();
    await autoSentinel.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await autoSentinel.owner()).to.equal(owner.address);
    });

    it("Should authorize owner by default", async function () {
      expect(await autoSentinel.isAuthorized(owner.address)).to.be.true;
    });

    it("Should initialize with default threshold", async function () {
      expect(await autoSentinel.threshold()).to.equal(75n);
    });

    it("Should start with zero statistics", async function () {
      const stats = await autoSentinel.getStatistics();
      expect(stats._totalUpdates).to.equal(0n);
      expect(stats._totalThresholdTriggers).to.equal(0n);
    });
  });

  describe("State Updates", function () {
    it("Should allow authorized caller to update state", async function () {
      await autoSentinel.updateSentinelState(
        PRICE_ETH,
        PRICE_BTC,
        SCORE,
        true,
        REASON
      );

      const state = await autoSentinel.getLatestState();
      expect(state.priceETH).to.equal(PRICE_ETH);
      expect(state.priceBTC).to.equal(PRICE_BTC);
      expect(state.aggregatedScore).to.equal(SCORE);
      expect(state.thresholdTriggered).to.be.true;
      expect(state.decisionReason).to.equal(REASON);
    });

    it("Should emit StateUpdated event", async function () {
      await expect(
        autoSentinel.updateSentinelState(
          PRICE_ETH,
          PRICE_BTC,
          SCORE,
          true,
          REASON
        )
      )
        .to.emit(autoSentinel, "StateUpdated")
        .withArgs(
          (timestamp: bigint) => timestamp > 0n,
          PRICE_ETH,
          PRICE_BTC,
          SCORE,
          true
        );
    });

    it("Should emit ThresholdTriggered event when triggered", async function () {
      await expect(
        autoSentinel.updateSentinelState(
          PRICE_ETH,
          PRICE_BTC,
          SCORE,
          true,
          REASON
        )
      )
        .to.emit(autoSentinel, "ThresholdTriggered")
        .withArgs((timestamp: bigint) => timestamp > 0n, REASON, SCORE);
    });

    it("Should not emit ThresholdTriggered when not triggered", async function () {
      await expect(
        autoSentinel.updateSentinelState(
          PRICE_ETH,
          PRICE_BTC,
          50n,
          false,
          "Normal conditions"
        )
      ).to.not.emit(autoSentinel, "ThresholdTriggered");
    });

    it("Should reject unauthorized caller", async function () {
      await expect(
        autoSentinel
          .connect(user1)
          .updateSentinelState(PRICE_ETH, PRICE_BTC, SCORE, true, REASON)
      ).to.be.revertedWith("AutoSentinel: caller is not authorized");
    });

    it("Should reject invalid ETH price", async function () {
      await expect(
        autoSentinel.updateSentinelState(0n, PRICE_BTC, SCORE, true, REASON)
      ).to.be.revertedWith("AutoSentinel: invalid ETH price");
    });

    it("Should reject invalid BTC price", async function () {
      await expect(
        autoSentinel.updateSentinelState(PRICE_ETH, 0n, SCORE, true, REASON)
      ).to.be.revertedWith("AutoSentinel: invalid BTC price");
    });

    it("Should reject score over 100", async function () {
      await expect(
        autoSentinel.updateSentinelState(PRICE_ETH, PRICE_BTC, 101n, true, REASON)
      ).to.be.revertedWith("AutoSentinel: score must be 0-100");
    });

    it("Should enforce rate limiting", async function () {
      await autoSentinel.updateSentinelState(
        PRICE_ETH,
        PRICE_BTC,
        SCORE,
        true,
        REASON
      );

      await expect(
        autoSentinel.updateSentinelState(
          PRICE_ETH,
          PRICE_BTC,
          SCORE,
          true,
          REASON
        )
      ).to.be.revertedWith("AutoSentinel: update too frequent");
    });

    it("Should update statistics correctly", async function () {
      await autoSentinel.updateSentinelState(
        PRICE_ETH,
        PRICE_BTC,
        SCORE,
        true,
        REASON
      );

      const stats = await autoSentinel.getStatistics();
      expect(stats._totalUpdates).to.equal(1n);
      expect(stats._totalThresholdTriggers).to.equal(1n);
    });
  });

  describe("History", function () {
    it("Should store state history", async function () {
      // First update
      await autoSentinel.updateSentinelState(
        PRICE_ETH,
        PRICE_BTC,
        SCORE,
        true,
        REASON
      );

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine", []);

      // Second update
      const newPriceETH = ethers.parseUnits("2460.00", 8);
      await autoSentinel.updateSentinelState(
        newPriceETH,
        PRICE_BTC,
        75n,
        false,
        "Price increased"
      );

      const historyLength = await autoSentinel.getHistoryLength();
      expect(historyLength).to.equal(1n);

      const history = await autoSentinel.getStateHistory(1);
      expect(history[0].priceETH).to.equal(PRICE_ETH);
    });
  });

  describe("Authorization", function () {
    it("Should allow owner to authorize new caller", async function () {
      await autoSentinel.setAuthorizedCaller(user1.address, true);
      expect(await autoSentinel.isAuthorized(user1.address)).to.be.true;
    });

    it("Should allow owner to revoke authorization", async function () {
      await autoSentinel.setAuthorizedCaller(user1.address, true);
      await autoSentinel.setAuthorizedCaller(user1.address, false);
      expect(await autoSentinel.isAuthorized(user1.address)).to.be.false;
    });

    it("Should emit AuthorizedCallerUpdated event", async function () {
      await expect(autoSentinel.setAuthorizedCaller(user1.address, true))
        .to.emit(autoSentinel, "AuthorizedCallerUpdated")
        .withArgs(user1.address, true);
    });

    it("Should reject non-owner from authorizing", async function () {
      await expect(
        autoSentinel.connect(user1).setAuthorizedCaller(user2.address, true)
      ).to.be.revertedWith("AutoSentinel: caller is not owner");
    });

    it("Should reject zero address", async function () {
      await expect(
        autoSentinel.setAuthorizedCaller(ethers.ZeroAddress, true)
      ).to.be.revertedWith("AutoSentinel: invalid address");
    });
  });

  describe("Threshold", function () {
    it("Should allow owner to update threshold", async function () {
      await autoSentinel.setThreshold(80n);
      expect(await autoSentinel.threshold()).to.equal(80n);
    });

    it("Should emit ThresholdUpdated event", async function () {
      await expect(autoSentinel.setThreshold(80n))
        .to.emit(autoSentinel, "ThresholdUpdated")
        .withArgs(75n, 80n);
    });

    it("Should reject threshold over 100", async function () {
      await expect(autoSentinel.setThreshold(101n)).to.be.revertedWith(
        "AutoSentinel: threshold must be 0-100"
      );
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      await autoSentinel.transferOwnership(user1.address);
      expect(await autoSentinel.owner()).to.equal(user1.address);
    });

    it("Should authorize new owner", async function () {
      await autoSentinel.transferOwnership(user1.address);
      expect(await autoSentinel.isAuthorized(user1.address)).to.be.true;
    });

    it("Should emit OwnershipTransferred event", async function () {
      await expect(autoSentinel.transferOwnership(user1.address))
        .to.emit(autoSentinel, "OwnershipTransferred")
        .withArgs(owner.address, user1.address);
    });

    it("Should reject zero address for new owner", async function () {
      await expect(
        autoSentinel.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("AutoSentinel: invalid new owner");
    });
  });

  describe("Time Until Next Update", function () {
    it("Should return 0 before first update", async function () {
      expect(await autoSentinel.timeUntilNextUpdate()).to.equal(0n);
    });

    it("Should return positive value after update", async function () {
      await autoSentinel.updateSentinelState(
        PRICE_ETH,
        PRICE_BTC,
        SCORE,
        true,
        REASON
      );

      const timeUntil = await autoSentinel.timeUntilNextUpdate();
      expect(timeUntil).to.be.greaterThan(0n);
      expect(timeUntil).to.be.lessThanOrEqual(60n);
    });
  });
});
