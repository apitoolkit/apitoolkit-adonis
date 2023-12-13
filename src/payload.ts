
// ATError is the Apitoolkit error type/object
export type ATError = {
    when: string; // timestamp
    error_type: string;
    root_error_type?: string;
    message: string;
    root_error_message?: string;
    stack_trace: string;
};

// Payload is an APIToolkit Request Mesasge. It is very standardize,
// and all the other SDKs send this exact type to apitoolkit backend servers as well.
export type Payload = {
    duration: number;
    host: string;
    method: string;
    path_params: Record<string, any>;
    project_id: string;
    proto_major: number;
    proto_minor: number;
    query_params: Record<string, any>;
    raw_url: string;
    referer: string;
    request_body: string;
    request_headers: Record<string, any>;
    response_body: string;
    response_headers: Record<string, any>;
    sdk_type: string;
    status_code: number;
    timestamp: string;
    url_path: string;
    errors: ATError[];
    service_version?: string;
    tags: string[];
    msg_id?: string;
    parent_id?: string;
};