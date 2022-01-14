import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import * as directoryTree from 'directory-tree';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@repository/user/user.service';
import { lastValueFrom, map } from 'rxjs';
import { ConfigService } from 'nestjs-config';

@Controller('file')
export class FileController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  @Get('tree')
  async getFileTree(@Req() request: Request) {
    const token = request.cookies['access_token'];
    const _id = this.jwtService.decode(token)?.['_id'];
    const user = (await this.userService.find({ _id }))?.[0];

    const fileTree = directoryTree('./files');
    fileTree.children = fileTree.children.filter(
      (child) => child.name === user?.username || child.name === 'public',
    );
    return fileTree;
  }

  @Get()
  async getFileContent(@Query('path') path: string, @Res() response: Response) {
    response.sendFile(`./files/${path}`);
  }

  // TODO remove the below temp stuffs
  private readonly userData = {};

  @Post('run')
  async runCode(@Body('code') code: string) {
    const pythonRunnerUrl = `${
      this.configService.get('python-runner.config')['baseUrl']
    }/run`;
    console.log(pythonRunnerUrl);
    const data = await lastValueFrom(
      this.httpService
        .post(pythonRunnerUrl, code, {
          headers: { 'Content-type': 'text/plain' },
        })
        .pipe(map((res) => res.data)),
    );
    const id = new Date().getTime().toString();
    this.userData[id] = data.result;
    return {
      id,
      output: data.output,
      result: data.result,
    };
  }

  @Get('vis')
  async tempVisData(@Query('id') id: string) {
    return this.userData[id];
  }
}
