import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
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
@Controller("api/wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get("balance")
  @ApiBearerAuth()
  @ApiOkResponseWrapper(BalanceResponseDto)
  async getBalance(@Session() session: UserSession): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(session.user.id);
  }

  @Get("transactions")
  @ApiBearerAuth()
  @ApiOkResponseWrapper(TransactionsResponseDto)
  async getTransactions(
    @Session() session: UserSession,
    @Query() query: TransactionsQueryDto,
  ): Promise<TransactionsResponseDto> {
    return this.walletService.getTransactions(session.user.id, query);
  }

  @Post("topup")
  @ApiBearerAuth()
  @ApiBody({ type: TopUpWalletDto })
  @ApiOkResponseWrapper(TopUpResponseDto)
  async topUpWallet(
    @Session() session: UserSession,
    @Body() dto: TopUpWalletDto,
  ): Promise<TopUpResponseDto> {
    return this.walletService.topUpWallet(session.user.id, dto);
  }

  @Post("withdraw")
  @ApiBearerAuth()
  @ApiBody({ type: WithdrawWalletDto })
  @ApiOkResponseWrapper(WithdrawResponseDto)
  async withdrawWallet(
    @Session() session: UserSession,
    @Body() dto: WithdrawWalletDto,
  ): Promise<WithdrawResponseDto> {
    return this.walletService.withdrawWallet(session.user.id, dto);
  }
}
