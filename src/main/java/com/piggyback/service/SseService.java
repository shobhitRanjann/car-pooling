package com.piggyback.service;

import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Log4j2
public class SseService {

    // Map of user email to their active SseEmitter
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String email) {
        // Create an emitter with a longer timeout (e.g., 30 minutes)
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        emitters.put(email, emitter);

        emitter.onCompletion(() -> {
            log.info("SSE completed for {}", email);
            emitters.remove(email);
        });

        emitter.onTimeout(() -> {
            log.info("SSE timeout for {}", email);
            emitters.remove(email);
        });

        emitter.onError(e -> {
            log.error("SSE error for {}", email, e);
            emitters.remove(email);
        });

        try {
            // Send an initial dummy event to establish connection quickly
            emitter.send(SseEmitter.event().name("INIT").data("Connected"));
        } catch (IOException e) {
            emitters.remove(email);
        }

        return emitter;
    }

    public void sendToUser(String email, String eventName, String data) {
        SseEmitter emitter = emitters.get(email);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException e) {
                emitters.remove(email);
            }
        }
    }

    public void broadcastToDomain(String domain, String eventName, String data, String excludeEmail) {
        String suffix = "@" + domain;
        emitters.forEach((email, emitter) -> {
            if (email.endsWith(suffix) && !email.equals(excludeEmail)) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (IOException e) {
                    emitters.remove(email);
                }
            }
        });
    }
}
