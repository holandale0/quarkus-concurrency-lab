package org.leonardo.quarkusconcurrencylab.application.controller;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.leonardo.quarkusconcurrencylab.application.dto.ProcessingRequest;
import org.leonardo.quarkusconcurrencylab.application.dto.ProcessingResponse;
import org.leonardo.quarkusconcurrencylab.application.service.ProcessingService;

@Path("/process")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ProcessingController {

    @Inject
    ProcessingService service;

    @POST
    @Path("/{type}")
    public ProcessingResponse process(@PathParam("type") String type,
                                      ProcessingRequest request) {
        return service.process(request, type);
    }
}
