package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.VendorService;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/vendors")
public class VendorController {

    private final VendorService vendorService;

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @GetMapping
    public ApiResponse<List<VendorItem>> list(Authentication authentication) {
        return ApiResponse.success(vendorService.list(authentication));
    }

    @PostMapping
    public ApiResponse<VendorItem> create(Authentication authentication, @Valid @RequestBody VendorRequest request) {
        return ApiResponse.success(vendorService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<VendorItem> update(Authentication authentication, @PathVariable Long id,
                                          @Valid @RequestBody VendorRequest request) {
        return ApiResponse.success(vendorService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        vendorService.delete(authentication, id);
        return ApiResponse.success(null);
    }
}
