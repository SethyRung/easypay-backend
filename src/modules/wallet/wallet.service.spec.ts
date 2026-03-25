import { NotFoundException, BadRequestException } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WalletRepository } from "./wallet.repository";
import { ConfigService } from "@nestjs/config";

describe("WalletService", () => {
  let walletService: WalletService;
  let walletRepository: jest.Mocked<WalletRepository>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    walletRepository = {
      findWalletByUserId: jest.fn(),
      getTransactionHistory: jest.fn(),
      topUpWallet: jest.fn(),
    } as unknown as jest.Mocked<WalletRepository>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === "TOPUP_MAX_PER_TX_MINOR") return "100000";
        if (key === "TOPUP_MAX_DAILY_MINOR") return "500000";
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    walletService = new WalletService(walletRepository, configService);
  });

  describe("topUpWallet", () => {
    it("should return mapped top-up response on success", async () => {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      walletRepository.topUpWallet.mockResolvedValue({
        wallet: {
          id: "wallet-1",
          currency: "USD",
          balanceMinor: 15000,
        },
        entry: {
          id: "entry-1",
          createdAt,
        },
        balanceBeforeMinor: 5000,
      } as any);

      const result = await walletService.topUpWallet("user-1", {
        amount: 100,
        note: "Bank transfer",
      });

      expect(walletRepository.topUpWallet).toHaveBeenCalledWith(
        "user-1",
        10000,
        500000,
        "Bank transfer",
      );
      expect(result).toEqual({
        walletId: "wallet-1",
        currency: "USD",
        amountMinor: 10000,
        amount: 100,
        balanceBeforeMinor: 5000,
        balanceAfterMinor: 15000,
        transactionId: "entry-1",
        createdAt,
      });
    });

    it("should throw NotFoundException when wallet does not exist", async () => {
      walletRepository.topUpWallet.mockResolvedValue(null);

      await expect(walletService.topUpWallet("missing-user", { amount: 10 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when amount exceeds per transaction limit", async () => {
      await expect(walletService.topUpWallet("user-1", { amount: 1000.01 })).rejects.toThrow(
        BadRequestException,
      );
      expect(walletRepository.topUpWallet).not.toHaveBeenCalled();
    });
  });
});
