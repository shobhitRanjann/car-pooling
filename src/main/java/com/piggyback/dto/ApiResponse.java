package com.piggyback.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;

    /** Convenience factory for simple success messages. */
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    /** Convenience factory for success with no body data. */
    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, message, null);
    }

    /** Convenience factory for error responses. */
    public static ApiResponse<Void> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
