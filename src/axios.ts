import { HttpContext } from "@adonisjs/core/build/standalone";
import {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from "axios";
import { buildPayload } from "apitoolkit-js";
import { ATError } from "./payload";

declare module "axios" {
    export interface InternalAxiosRequestConfig {
        meta: any;
    }
}

export const onRequest = (
    config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
    config.meta = { startTime: process.hrtime.bigint() };
    return config;
};

export const onRequestError = (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
};

export const onResponse =
    (
        urlWildcard: string | undefined,
        redactHeaderLists: string[],
        redactRequestBody: string[],
        redactResponseBody: string[],
    ) =>
        (response: AxiosResponse): AxiosResponse => {
            const ctx = HttpContext.get();
            if (!ctx) {
                console.log(
                    "APIToolkit: Context not found, make sure to enable asyncLocalStorage in your project",
                );
                return response;
            }
            if (!ctx.apitoolkitData) {
                console.log(
                    "APIToolkit: data not found, make sure to set disable to false in apitoolkitConfig",
                );
                return response
            }
            const req = response.config;
            const res = response;

            const reqBody = typeof req?.data === "string" ? req.data : JSON.stringify(req?.data || {});
            const respBody = typeof req?.data === "string" ? res?.data as string : JSON.stringify(res?.data || {});

            const project_id = ctx.apitoolkitData.project_id
            const ATClient = ctx.apitoolkitData.client
            const ATConfig = ctx.apitoolkitData.config
            const parent_id = ctx.apitoolkitData.msg_id

            const errors: ATError[] = [];
            const {
                path: urlPath,
                rawUrl,
                queryParams
            } = getPathAndQueryParamsFromURL(req.url ?? "");
            const payload = buildPayload({
                start_time: response.config.meta.startTime,
                requestHeaders: req.headers,
                responseHeaders: res.headers,
                reqParams: req.params,
                reqQuery: queryParams,
                reqBody,
                respBody,
                sdk_type: "JsAxiosOutgoing" as any,
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
                host: req.baseURL || "",
                method: req.method || "",
                status_code: res.status
            });

            ATClient.publishMessage(payload);
            return response;
        };

export const onResponseError =
    (
        urlWildcard: string | undefined,
        redactHeaderLists: string[],
        redactRequestBody: string[],
        redactResponseBody: string[],
    ) =>
        (error: AxiosError): Promise<AxiosError> => {
            const ctx = HttpContext.get();
            if (!ctx) {
                console.log(
                    "APIToolkit: Context not found, make sure to enable asyncLocalStorage in your project",
                );
                return Promise.reject(error);
            }
            if (!ctx.apitoolkitData) {
                console.log(
                    "APIToolkit: data not found, make sure to set disable to false in apitoolkitConfig",
                );
                return Promise.reject(error);
            }

            const req = error.config;
            const res = error.response;

            const reqBody = typeof req?.data === "string" ? req.data : JSON.stringify(req?.data || {});
            const respBody = typeof req?.data === "string" ? res?.data as string : JSON.stringify(res?.data || {});

            const project_id = ctx.apitoolkitData.project_id
            const ATClient = ctx.apitoolkitData.client
            const ATConfig = ctx.apitoolkitData.config
            const parent_id = ctx.apitoolkitData.msg_id

            const errors: ATError[] = [];

            const {
                path: urlPath,
                rawUrl,
                queryParams
            } = getPathAndQueryParamsFromURL(req?.url ?? "");
            const payload = buildPayload({
                start_time: error.config?.meta.startTime ?? process.hrtime.bigint(),
                requestHeaders: req?.headers || {},
                responseHeaders: res?.headers || {},
                reqParams: req?.params || {},
                reqQuery: queryParams,
                reqBody,
                respBody,
                sdk_type: "JSAxiosOutgoing" as any,
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
                host: req?.baseURL || "",
                method: req?.method || "",
                status_code: res?.status || 404
            });

            ATClient.publishMessage(payload);

            return Promise.reject(error);
        };

export function observeAxios(
    axiosInstance: AxiosInstance,
    urlWildcard: string | undefined = undefined,
    redactHeaders: string[] = [],
    redactRequestBody: string[] = [],
    redactResponseBody: string[] = [],
): AxiosInstance {
    axiosInstance.interceptors.request.use(onRequest, onRequestError);
    axiosInstance.interceptors.response.use(
        onResponse(
            urlWildcard,
            redactHeaders,
            redactRequestBody,
            redactResponseBody,
        ),
        onResponseError(
            urlWildcard,
            redactHeaders,
            redactRequestBody,
            redactResponseBody,
        ),
    );
    return axiosInstance;
}

function getPathAndQueryParamsFromURL(url: string) {
    try {
        const urlObject = new URL(url);
        const path = urlObject.pathname;
        const queryParams: { [key: string]: string } = {};
        const queryParamsString = urlObject.search;
        urlObject.searchParams.forEach((value, key) => {
            queryParams[key] = value;
        });

        return { path, queryParams, rawUrl: path + queryParamsString };
    } catch (error) {
        return { path: "", queryParams: {}, rawUrl: "" };
    }
}