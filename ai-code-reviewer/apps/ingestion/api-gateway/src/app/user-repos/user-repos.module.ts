import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserReposController } from './user-repos.controller';
import { UserReposService } from './user-repos.service';

@Module({
  imports: [AuthModule],
  controllers: [UserReposController],
  providers: [UserReposService],
})
export class UserReposModule {}
