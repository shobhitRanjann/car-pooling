package com.piggyback.exception;

import org.springframework.http.HttpStatus;

/**
 * Application-level runtime exception that carries an HTTP status code.
 * Caught by GlobalExceptionHandler and converted to an appropriate JSON error response.
 */
public class AppException extends RuntimeException {

    private final HttpStatus status;

    public AppException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
