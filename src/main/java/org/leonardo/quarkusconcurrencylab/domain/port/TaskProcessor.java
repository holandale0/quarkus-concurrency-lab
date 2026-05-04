package org.leonardo.quarkusconcurrencylab.domain.port;

public interface TaskProcessor {
    long process(int latencyMs);
}
