import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { CurrentUser, type CurrentUserData } from "@common/decorators/current-user.decorator";
import { ApiTags, ApiOkResponse, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import {
  TransactionsQueryDto,
  BalanceResponseDto,
  TransactionsResponseDto,
  TopUpWalletDto,
  TopUpResponseDto,
} from "./dto";

@ApiTags("wallet")
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get("balance")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Balance retrieved successfully", type: BalanceResponseDto })
  async getBalance(@CurrentUser() user: CurrentUserData): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(user.userId);
  }

  @Get("transactions")
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Transactions retrieved successfully",
    type: TransactionsResponseDto,
  })
  async getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Query() query: TransactionsQueryDto,
  ): Promise<TransactionsResponseDto> {
    return this.walletService.getTransactions(user.userId, query);
  }

  @Post("topup")
  @ApiBearerAuth()
  @ApiBody({ type: TopUpWalletDto })
  @ApiOkResponse({ description: "Wallet topped up successfully", type: TopUpResponseDto })
  async topUpWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TopUpWalletDto,
  ): Promise<TopUpResponseDto> {
    return this.walletService.topUpWallet(user.userId, dto);
  }
}
