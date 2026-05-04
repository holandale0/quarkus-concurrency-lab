package org.leonardo.quarkusconcurrencylab.infrastructure.executor;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@ApplicationScoped
public class ThreadPoolExecutorStrategy {

    @ConfigProperty(name = "processing.thread-pool.size", defaultValue = "50")
    int poolSize;

    private ExecutorService executor;

    @PostConstruct
    void init() {
        executor = Executors.newFixedThreadPool(poolSize);
    }

    public ExecutorService get() {
        return executor;
    }

    @PreDestroy
    void destroy() {
        executor.shutdown();
    }
}
