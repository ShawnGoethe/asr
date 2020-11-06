import { HttpService, Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Client = require('@alicloud/nls-filetrans-2018-08-17');
import { ConfigService } from './../config';
@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  // @ApiOperation(value = "列表", notes = "分页列表")
  // @ApiTags('authentication')
  async asr(url: string, platform: Array<string>): Promise<any> {
    let word = '';
    if (platform.indexOf('ali') > -1) {
      word = word + 'ali:' + (await this.aliTrans(url)) + '/n';
    }
    if (platform.indexOf('wenwen') > -1) {
      word = word + 'wenwen:' + (await this.wwTrans(url));
    }
    return word;
  }
  async aliTrans(url: string): Promise<any> {
    const akId = this.configService.get('ALI_AKID');
    const akSecret = this.configService.get('ALI_AKSECRET');
    const appKey = this.configService.get('ALI_APPKEY');
    const fileLink = url;
    //地域ID，固定值。
    const ENDPOINT = 'http://filetrans.cn-shanghai.aliyuncs.com';
    const API_VERSION = '2018-08-17';
    const client = new Client({
      accessKeyId: akId,
      secretAccessKey: akSecret,
      endpoint: ENDPOINT,
      apiVersion: API_VERSION,
    });
    const task = JSON.stringify({
      appkey: appKey,
      file_link: fileLink,
      enable_sample_rate_adaptive: true,
      version: '4.0',
      enable_words: false,
    });
    const taskParams = {
      Task: task,
    };
    const options = {
      method: 'POST',
    };
    // 提交录音文件识别请求，处理服务端返回的响应。
    async function getWords() {
      return new Promise((resolve, reject) => {
        client
          .submitTask(taskParams, options)
          .then(response => {
            console.log(response);
            // 服务端响应信息的状态描述StatusText。
            const statusText = response.StatusText;
            if (statusText != 'SUCCESS') {
              console.log('录音文件识别请求响应失败!');
            }
            console.log('录音文件识别请求响应成功!');
            // 获取录音文件识别请求任务的TaskId，以供识别结果查询使用。
            const taskId = response.TaskId;
            /**
             * 以TaskId为查询参数，提交识别结果查询请求。
             * 以轮询的方式进行识别结果的查询，直到服务端返回的状态描述为"SUCCESS"、SUCCESS_WITH_NO_VALID_FRAGMENT，
             * 或者为错误描述，则结束轮询。
             */
            const taskIdParams = {
              TaskId: taskId,
            };
            const timer = setInterval(() => {
              client
                .getTaskResult(taskIdParams)
                .then(response => {
                  console.log('识别结果查询响应：');
                  console.log(response);
                  const statusText = response.StatusText;
                  if (statusText == 'RUNNING' || statusText == 'QUEUEING') {
                    // 继续轮询，注意间隔周期。
                  } else {
                    if (
                      statusText == 'SUCCESS' ||
                      statusText == 'SUCCESS_WITH_NO_VALID_FRAGMENT'
                    ) {
                      console.log('录音文件识别成功：');
                      let sentences = '';
                      const BeginTime = [];
                      for (const s of response.Result.Sentences) {
                        if (BeginTime.indexOf(s.BeginTime) > -1) {
                          continue;
                        }
                        sentences += s.Text;
                        BeginTime.push(s.BeginTime);
                      }
                      console.log(response.Result);
                      resolve(sentences);
                      // return sentences;
                    } else {
                      console.log('录音文件识别失败!');
                    }
                    // 退出轮询
                    clearInterval(timer);
                  }
                })
                .catch(error => {
                  console.error(error);
                  // 异常情况，退出轮询。
                  clearInterval(timer);
                });
            }, 10000);
          })
          .catch(error => {
            console.error(error);
          });
      });
    }
    return await getWords();
  }
  async wwTrans(url: string): Promise<any> {
    const serverUrl = this.configService.get('WEN_URL');
    // data format
    const data: Record<string, unknown> = {
      audioUrl: url,
      // fileData: {
      //   encoding: 'wav',
      //   language: 'MANDARIN',
      //   sampleRateHertz: '48000', //16
      //   audioName: 'fileName',
      // },
      // recognitionConfig: {
      //   model: 'GENERAL',
      //   enablePunctuation: true,
      //   enableItn: true,
      //   enableWordTimeOffsets: false,
      //   speechContexts: [],
      //   diarizationConfig: {
      //     enableDiarization: false,
      //     speakerNumber: 1,
      //   },
      // },
    };
    const option: Record<string, unknown> = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    async function getWords() {
      return new Promise(async (resolve, reject) => {
        const response: any = await axios.post(serverUrl, data, option);
        console.log(response.data);
        if (!response.data || response.data.rtn != 0) {
          console.log('录音文件识别请求响应失败!');
          console.log('失败信息：' + response.data.message);
        }
        console.log('录音文件识别请求响应成功!');
        const taskId: any = response.data.taskId;
        const timer = setInterval(() => {
          axios
            .get(serverUrl + '/' + taskId)
            .then(response => {
              console.log('识别结果查询响应：');
              if (response.data.rtn != 0) {
                console.log('录音文件识别请求响应失败!');
                console.log('失败信息：' + response.data.message);
              }
              const { statusCode, statusText } = response.data.data;

              console.log('识别结果编码：' + statusCode + ',' + statusText);
              if (statusCode !== 3 && statusCode !== 4) {
                // 继续轮询，注意间隔周期。
              } else {
                if (statusCode === 3) {
                  console.log('录音文件识别成功：');
                  resolve(response.data.data.speechResult.resultText);
                  // return sentences;
                } else {
                  console.log('录音文件识别取消!');
                }
                // 退出轮询
                clearInterval(timer);
              }
            })
            .catch(error => {
              console.error(error);
              // 异常情况，退出轮询。
              clearInterval(timer);
            });
        }, 5000);
      });
    }
    return await getWords();
  }
}
