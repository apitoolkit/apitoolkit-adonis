declare module "@ioc:APIToolkit" {
  import { ApplicationContract } from "@ioc:Adonis/Core/Application";
  import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
  import { AxiosStatic } from "axios";

  export type ClientMetadata = {
    project_id: string;
    pubsub_project_id: string;
    topic_id: string;
    pubsub_push_service_account: any;
  };

  export type APIToolkitConfig = {
    apiKey: string;
    rootURL?: string;
    debug?: boolean;
    redactHeaders?: string[];
    redactRequestBody?: string[];
    redactResponseBody?: string[];
    clientMetadata?: ClientMetadata;
    serviceVersion?: string;
    tags?: string[];
    disable?: boolean;
    monitorAxios?: AxiosStatic;
  };

  export interface APIToolkitMiddlewareContract {
    new (application: ApplicationContract): {
      handle(ctx: HttpContextContract, next: () => Promise<void>): any;
    };
  }

  const APIToolkitMiddleware: APIToolkitMiddlewareContract;
  export default APIToolkitMiddleware;
}
