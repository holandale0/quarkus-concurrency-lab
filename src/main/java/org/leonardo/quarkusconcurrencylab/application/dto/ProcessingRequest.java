package org.leonardo.quarkusconcurrencylab.application.dto;

public record ProcessingRequest(
    int numberOfTasks,
    int simulatedLatencyMs
) {}