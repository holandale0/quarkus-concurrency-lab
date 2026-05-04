package org.leonardo.quarkusconcurrencylab.infrastructure.external;

import jakarta.enterprise.context.ApplicationScoped;
import org.leonardo.quarkusconcurrencylab.domain.port.ExternalServicePort;

@ApplicationScoped
public class ExternalServiceAdapter implements ExternalServicePort {

    @Override
    public void call(int latencyMs) {
        try {
            Thread.sleep(latencyMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
