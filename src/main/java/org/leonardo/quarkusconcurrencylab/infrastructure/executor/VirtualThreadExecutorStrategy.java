package org.leonardo.quarkusconcurrencylab.infrastructure.executor;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@ApplicationScoped
public class VirtualThreadExecutorStrategy {

    public ExecutorService create() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
