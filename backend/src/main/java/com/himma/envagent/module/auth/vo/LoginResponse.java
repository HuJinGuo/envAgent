package com.himma.envagent.module.auth.vo;

public class LoginResponse {

    private String token;
    private String tokenType;
    private long expiresIn;
    private UserProfileVO user;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(long expiresIn) {
        this.expiresIn = expiresIn;
    }

    public UserProfileVO getUser() {
        return user;
    }

    public void setUser(UserProfileVO user) {
        this.user = user;
    }
}
