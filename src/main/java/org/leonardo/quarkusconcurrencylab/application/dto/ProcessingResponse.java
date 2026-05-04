package org.leonardo.quarkusconcurrencylab.application.dto;

public record ProcessingResponse(
    long totalTimeMs,
    int processedTasks,
    String executionType,
    long avgTaskTimeMs,
    double throughputRps
) {}
