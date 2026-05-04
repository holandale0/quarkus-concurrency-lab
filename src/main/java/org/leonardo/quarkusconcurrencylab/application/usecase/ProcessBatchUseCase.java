package org.leonardo.quarkusconcurrencylab.application.usecase;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.leonardo.quarkusconcurrencylab.application.dto.ProcessingRequest;
import org.leonardo.quarkusconcurrencylab.application.dto.ProcessingResponse;
import org.leonardo.quarkusconcurrencylab.domain.port.TaskProcessor;
import org.leonardo.quarkusconcurrencylab.infrastructure.executor.ThreadPoolExecutorStrategy;
import org.leonardo.quarkusconcurrencylab.infrastructure.executor.VirtualThreadExecutorStrategy;
import org.leonardo.quarkusconcurrencylab.infrastructure.metrics.MetricsService;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

@ApplicationScoped
public class ProcessBatchUseCase {

    @Inject
    ThreadPoolExecutorStrategy threadPoolStrategy;

    @Inject
    VirtualThreadExecutorStrategy virtualStrategy;

    @Inject
    TaskProcessor taskProcessor;

    @Inject
    MetricsService metricsService;

    public ProcessingResponse execute(ProcessingRequest request, String type) {
        boolean isVirtual = "virtual".equalsIgnoreCase(type);

        if (!isVirtual && !"platform".equalsIgnoreCase(type)) {
            throw new IllegalArgumentException("Use 'virtual' or 'platform'");
        }

        ExecutorService executor = isVirtual
                ? virtualStrategy.create()
                : threadPoolStrategy.get();

        long start = System.currentTimeMillis();

        List<Future<Long>> futures = new ArrayList<>(request.numberOfTasks());
        for (int i = 0; i < request.numberOfTasks(); i++) {
            futures.add(executor.submit(() -> taskProcessor.process(request.simulatedLatencyMs())));
        }

        List<Long> taskTimes = collectResults(futures);

        // virtual executors are scoped per-batch; platform pool is shared and must not be shut down
        if (isVirtual) {
            executor.shutdown();
        }

        long totalMs = System.currentTimeMillis() - start;
        long avgTaskMs = taskTimes.isEmpty() ? 0
                : taskTimes.stream().mapToLong(Long::longValue).sum() / taskTimes.size();
        double throughput = totalMs > 0 ? (request.numberOfTasks() * 1000.0) / totalMs : 0;

        ProcessingResponse response = new ProcessingResponse(totalMs, request.numberOfTasks(), type, avgTaskMs, throughput);
        metricsService.record(response);
        return response;
    }

    private List<Long> collectResults(List<Future<Long>> futures) {
        List<Long> results = new ArrayList<>(futures.size());
        for (Future<Long> f : futures) {
            try {
                results.add(f.get());
            } catch (Exception e) {
                results.add(-1L);
            }
        }
        return results;
    }
}
