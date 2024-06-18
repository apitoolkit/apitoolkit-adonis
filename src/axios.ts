import { HttpContext } from '@adonisjs/core/http'
import {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  AxiosStatic,
  InternalAxiosRequestConfig,
} from 'axios'
import { buildPayload } from 'apitoolkit-js'
import { APIToolkitConfig, ATError } from './types.js'
import APIToolkitMiddleware from './middleware/apitoolkit_middleware.js'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    meta: any
  }
}

export const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  config.meta = { startTime: process.hrtime.bigint() }
  return config
}

export const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error)
}

function processResponse(
  response: AxiosResponse | AxiosError,
  urlWildcard: string | undefined,
  redactHeaderLists: string[],
  redactRequestBody: string[],
  redactResponseBody: string[],
  notWebContext: boolean,
  isGlobal: boolean,
  client: any
) {
  let req: any = response.config
  let res: AxiosResponse | AxiosError | undefined = response
  if (response instanceof Error) {
    res = response.response
    req = response.request
  } else {
    res = response
  }
  const ctx = HttpContext.get()
  const reqBody = typeof req?.data === 'string' ? req.data : JSON.stringify(req?.data || {})
  const respBody = typeof res?.data === 'string' ? res?.data : JSON.stringify(res?.data || {})
  const errors: ATError[] = []
  const { path: urlPath, rawUrl, queryParams } = getPathAndQueryParamsFromURL(req.url ?? '')

  if (notWebContext && client) {
    const config = client.getConfig()
    const project_id = config.project_id
    const ATConfig: APIToolkitConfig = config.config
    const parent_id: any = undefined

    const errors: ATError[] = []

    const payload = buildPayload({
      start_time: response.config?.meta.startTime || process.hrtime.bigint(),
      requestHeaders: req.headers,
      responseHeaders: res?.headers || {},
      reqParams: req.params,
      reqQuery: queryParams,
      reqBody,
      respBody,
      sdk_type: 'JsAxiosOutgoing' as any,
      redactRequestBody: redactRequestBody,
      redactResponseBody: redactResponseBody,
      redactHeaderLists: redactHeaderLists,
      project_id,
      service_version: ATConfig.serviceVersion,
      errors,
      tags: ATConfig.tags ?? [],
      parent_id,
      raw_url: rawUrl,
      msg_id: undefined as any,
      url_path: urlWildcard || urlPath,
      host: req.baseURL || '',
      method: req.method || '',
      status_code: res?.status || 404,
    })

    client.publishMessage(payload)
  } else {
    let config
    let ATClient
    let project_id
    let ATConfig: APIToolkitConfig | undefined
    let parent_id

    if (isGlobal) {
      config = client.getConfig()
      ATClient = client
      project_id = config.project_id
      ATConfig = config.config
      parent_id = ctx?.apitoolkitData.msg_id || undefined
    } else if (ctx) {
      project_id = ctx.apitoolkitData.project_id
      ATClient = ctx.apitoolkitData.client
      ATConfig = ctx.apitoolkitData.config
      parent_id = ctx.apitoolkitData.msg_id
    }
    if (ATConfig) {
      const payload = buildPayload({
        start_time: response.config?.meta.startTime || process.hrtime.bigint(),
        requestHeaders: req.headers,
        responseHeaders: res?.headers || {},
        reqParams: req.params,
        reqQuery: queryParams,
        reqBody,
        respBody,
        sdk_type: 'JsAxiosOutgoing' as any,
        redactRequestBody: redactRequestBody,
        redactResponseBody: redactResponseBody,
        redactHeaderLists: redactHeaderLists,
        project_id,
        service_version: ATConfig.serviceVersion,
        errors,
        tags: ATConfig.tags ?? [],
        parent_id,
        raw_url: rawUrl,
        msg_id: undefined as any,
        url_path: urlWildcard || urlPath,
        host: getHostFromUrl(req.baseURL),
        method: req.method || 'GET',
        status_code: res?.status || 404,
      })
      ATClient.publishMessage(payload)
    }
  }
}

export const onResponse =
  (
    urlWildcard: string | undefined,
    redactHeaderLists: string[],
    redactRequestBody: string[],
    redactResponseBody: string[],
    notWebContext: boolean,
    isGlobal: boolean,
    client: any
  ) =>
  (response: AxiosResponse): AxiosResponse => {
    const ctx = HttpContext.get()
    if (!ctx && !notWebContext && !isGlobal) {
      console.log(
        'APIToolkit: Context not found, make sure to enable asyncLocalStorage in your project'
      )
      return response
    }
    if (ctx && !isGlobal && !ctx.apitoolkitData) {
      console.log(
        'APIToolkit: data not found, make sure to set disable to false in apitoolkitConfig'
      )
      return response
    }
    try {
      processResponse(
        response,
        urlWildcard,
        redactHeaderLists,
        redactRequestBody,
        redactResponseBody,
        notWebContext,
        isGlobal,
        client
      )
      return response
    } catch (error) {
      return response
    }
  }

export const onResponseError =
  (
    urlWildcard: string | undefined,
    redactHeaderLists: string[],
    redactRequestBody: string[],
    redactResponseBody: string[],
    notWebContext: boolean,
    isGlobal: boolean,
    client: any
  ) =>
  (error: AxiosError): Promise<AxiosError> => {
    const ctx = HttpContext.get()
    if (!ctx && !notWebContext && !isGlobal) {
      console.log(
        'APIToolkit: Context not found, make sure to enable asyncLocalStorage in your project'
      )
      return Promise.reject(error)
    }
    if (ctx && !isGlobal && !ctx.apitoolkitData) {
      console.log(
        'APIToolkit: data not found, make sure to set disable to false in apitoolkitConfig'
      )
      return Promise.reject(error)
    }

    try {
      processResponse(
        error,
        urlWildcard,
        redactHeaderLists,
        redactRequestBody,
        redactResponseBody,
        notWebContext,
        isGlobal,
        client
      )
      return Promise.reject(error)
    } catch (error) {
      return Promise.reject(error)
    }
  }

export function observeAxios(
  axiosStatic: AxiosStatic,
  urlWildcard: string | undefined = undefined,
  redactHeaders: string[] = [],
  redactRequestBody: string[] = [],
  redactResponseBody: string[] = []
): AxiosInstance {
  const axiosInstance = axiosStatic.create()
  axiosInstance.interceptors.request.use(onRequest, onRequestError)
  axiosInstance.interceptors.response.use(
    onResponse(
      urlWildcard,
      redactHeaders,
      redactRequestBody,
      redactResponseBody,
      false,
      false,
      undefined
    ),
    onResponseError(
      urlWildcard,
      redactHeaders,
      redactRequestBody,
      redactResponseBody,
      false,
      false,
      undefined
    )
  )
  return axiosInstance
}
export function observeAxiosNotWebContext(
  axiosStatic: AxiosStatic,
  urlWildcard: string | undefined = undefined,
  redactHeaders: string[] = [],
  redactRequestBody: string[] = [],
  redactResponseBody: string[] = [],
  client: any
): AxiosInstance {
  const axiosInstance = axiosStatic.create()
  axiosInstance.interceptors.request.use(onRequest, onRequestError)
  axiosInstance.interceptors.response.use(
    onResponse(
      urlWildcard,
      redactHeaders,
      redactRequestBody,
      redactResponseBody,
      true,
      false,
      client
    ),
    onResponseError(
      urlWildcard,
      redactHeaders,
      redactRequestBody,
      redactResponseBody,
      true,
      false,
      client
    )
  )
  return axiosInstance
}
export function observeAxiosGlobal(
  axiosInstance: AxiosInstance,
  urlWildcard: string | undefined = undefined,
  redactHeaders: string[] = [],
  redactRequestBody: string[] = [],
  redactResponseBody: string[] = [],
  client: APIToolkitMiddleware
): AxiosInstance {
  axiosInstance.interceptors.request.use(onRequest, onRequestError)
  axiosInstance.interceptors.response.use(
    onResponse(
      urlWildcard,
      redactHeaders,
      redactRequestBody,
      redactResponseBody,
      false,
      true,
      client
    ),
    onResponseError(
      urlWildcard,
      redactHeaders,
      redactRequestBody,
      redactResponseBody,
      false,
      true,
      client
    )
  )
  return axiosInstance
}

function getPathAndQueryParamsFromURL(url: string) {
  try {
    const urlObject = new URL(url)
    const path = urlObject.pathname
    const queryParams: { [key: string]: string } = {}
    const queryParamsString = urlObject.search
    urlObject.searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    return { path, queryParams, rawUrl: path + queryParamsString }
  } catch (error) {
    return { path: '', queryParams: {}, rawUrl: '' }
  }
}

function getHostFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.host
  } catch (error) {
    return ''
  }
}
