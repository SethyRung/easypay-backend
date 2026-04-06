import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { CurrentUser, type CurrentUserData } from "@/common/decorators/current-user.decorator";
import { ApiOkResponseWrapper } from "@/common/decorators/api-response.decorator";
import { ApiTags, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import {
  TransactionsQueryDto,
  BalanceResponseDto,
  TransactionsResponseDto,
  TopUpWalletDto,
  TopUpResponseDto,
  WithdrawWalletDto,
  WithdrawResponseDto,
} from "./dto";

@ApiTags("wallet")
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get("balance")
  @ApiBearerAuth()
  @ApiOkResponseWrapper(BalanceResponseDto)
  async getBalance(@CurrentUser() user: CurrentUserData): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(user.userId);
  }

  @Get("transactions")
  @ApiBearerAuth()
  @ApiOkResponseWrapper(TransactionsResponseDto)
  async getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Query() query: TransactionsQueryDto,
  ): Promise<TransactionsResponseDto> {
    return this.walletService.getTransactions(user.userId, query);
  }

  @Post("topup")
  @ApiBearerAuth()
  @ApiBody({ type: TopUpWalletDto })
  @ApiOkResponseWrapper(TopUpResponseDto)
  async topUpWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TopUpWalletDto,
  ): Promise<TopUpResponseDto> {
    return this.walletService.topUpWallet(user.userId, dto);
  }

  @Post("withdraw")
  @ApiBearerAuth()
  @ApiBody({ type: WithdrawWalletDto })
  @ApiOkResponseWrapper(WithdrawResponseDto)
  async withdrawWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: WithdrawWalletDto,
  ): Promise<WithdrawResponseDto> {
    return this.walletService.withdrawWallet(user.userId, dto);
  }
}
