import dotenv from "dotenv"
import { die } from "../server/die"

export const Env: EnvType = {} as any

export interface EnvType {
  KOOKBaseUrl: string
  BotToken: string
  OpenAIKeys: string[]
  OpenAIBaseUrl: string
  ProxyUrl: string
  DeepSeekKeys: string[]
  StableDiffusionKeys: string[]
  ErnieAccessKey: string
  ErnieSecretKey: string
  QWeatherPrivateKey: string
  QWeatherKeyId: string
  QWeatherProjectId: string
  LarkAppId: string
  LarkAppSecret: string
  PublicArchivePath: string
  LogLevel: string
}

export function reloadConfig() {
  const result = dotenv.config({ path: ".env" })
  const config = result.parsed ?? {}

  console.log(Env)
  Object.assign(Env, {
    KOOKBaseUrl: config.KOOK_BASE_URL || die("环境配置错误：KOOK_BASE_URL"),
    BotToken: config.BOT_TOKEN || die("环境配置错误：BOT_TOKEN"),
    OpenAIKeys: config.OPENAI_API_KEYS?.split(",") || [],
    OpenAIBaseUrl: config.OPENAI_API_BASE_URL,
    ProxyUrl: config.PROXY_URL,
    DeepSeekKeys: config.DEEPSEEK_API_KEYS?.split(",") || [],
    StableDiffusionKeys: config.STABLE_DIFFUSION_API_KEYS?.split(",") || [],
    ErnieAccessKey:
      config.ERNIE_ACCESS_KEY || die("环境配置错误：ERNIE_ACCESS_KEY"),
    ErnieSecretKey:
      config.ERNIE_SECRET_KEY || die("环境配置错误：ERNIE_SECRET_KEY"),
    QWeatherPrivateKey:
      config.QWEATHER_PRIVATE_KEY.replace("\\n", "\n") ||
      die("环境配置错误：QWEATHER_PRIVATE_KEY"),
    QWeatherKeyId: config.QWEATHER_KID || die("环境配置错误：QWEATHER_KID"),
    QWeatherProjectId:
      config.QWEATHER_PID || die("环境配置错误：QWEATHER_PROJECT_ID"),
    LarkAppId: config.LARK_APP_ID,
    LarkAppSecret: config.LARK_APP_SECRET,
    PublicArchivePath: config.PUBLIC_ARCHIVE_PATH,
    LogLevel: config.LOG_LEVEL || "info"
  })
}

reloadConfig()
