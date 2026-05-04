package org.leonardo.quarkusconcurrencylab.domain.port;

public interface ExternalServicePort {
    void call(int latencyMs);
}