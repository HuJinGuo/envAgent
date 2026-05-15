package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.DictService;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictRequest;
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
@RequestMapping("/api/v1/admin/dict-items")
public class DictController {

    private final DictService dictService;

    public DictController(DictService dictService) {
        this.dictService = dictService;
    }

    @GetMapping
    public ApiResponse<List<DictItem>> list(Authentication authentication) {
        return ApiResponse.success(dictService.list(authentication));
    }

    @PostMapping
    public ApiResponse<DictItem> create(Authentication authentication, @Valid @RequestBody DictRequest request) {
        return ApiResponse.success(dictService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<DictItem> update(Authentication authentication, @PathVariable Long id,
                                        @Valid @RequestBody DictRequest request) {
        return ApiResponse.success(dictService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        dictService.delete(authentication, id);
        return ApiResponse.success(null);
    }
}
