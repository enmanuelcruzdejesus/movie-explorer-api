import { Global, Module } from '@nestjs/common';
import { JwtScopeGuard } from './jwt-scope.guard';

@Global()
@Module({
  providers: [JwtScopeGuard],
  exports: [JwtScopeGuard], // allow @UseGuards(JwtScopeGuard) in any feature
})
export class AuthModule {}
