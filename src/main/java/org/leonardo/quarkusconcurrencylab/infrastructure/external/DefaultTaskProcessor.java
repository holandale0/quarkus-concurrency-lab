package org.leonardo.quarkusconcurrencylab.infrastructure.external;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.leonardo.quarkusconcurrencylab.domain.port.ExternalServicePort;
import org.leonardo.quarkusconcurrencylab.domain.port.TaskProcessor;

@ApplicationScoped
public class DefaultTaskProcessor implements TaskProcessor {

    @Inject
    ExternalServicePort externalService;

    @Override
    public long process(int latencyMs) {
        long start = System.currentTimeMillis();
        externalService.call(latencyMs);
        // lightweight CPU work to simulate mixed I/O + CPU scenario
        double ignored = Math.sqrt(Math.random() * 1_000_000);
        return System.currentTimeMillis() - start;
    }
}
