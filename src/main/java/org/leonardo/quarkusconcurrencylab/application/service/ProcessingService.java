package org.leonardo.quarkusconcurrencylab.application.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.leonardo.quarkusconcurrencylab.application.dto.ProcessingRequest;
import org.leonardo.quarkusconcurrencylab.application.dto.ProcessingResponse;
import org.leonardo.quarkusconcurrencylab.application.usecase.ProcessBatchUseCase;

@ApplicationScoped
public class ProcessingService {

    @Inject
    ProcessBatchUseCase useCase;

    public ProcessingResponse process(ProcessingRequest request, String type) {
        return useCase.execute(request, type);
    }
}
