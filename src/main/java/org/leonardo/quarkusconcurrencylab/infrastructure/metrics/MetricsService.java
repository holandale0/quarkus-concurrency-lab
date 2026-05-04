package org.leonardo.quarkusconcurrencylab.infrastructure.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.leonardo.quarkusconcurrencylab.application.dto.ProcessingResponse;

import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class MetricsService {

    @Inject
    MeterRegistry registry;

    public void record(ProcessingResponse response) {
        Timer.builder("batch_processing_duration")
                .tag("execution_type", response.executionType())
                .description("Wall-clock time for a batch request")
                .register(registry)
                .record(response.totalTimeMs(), TimeUnit.MILLISECONDS);

        Counter.builder("batch_tasks_total")
                .tag("execution_type", response.executionType())
                .description("Cumulative number of tasks processed")
                .register(registry)
                .increment(response.processedTasks());
    }
}
