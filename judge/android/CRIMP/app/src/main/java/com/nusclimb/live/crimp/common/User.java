package com.nusclimb.live.crimp.common;

/**
 * @author Lin Weizhi (ecc.weizhi@gmail.com)
 */
public class User {
    private String facebookAccessToken;
    private String userName;
    private String userId;
    private String authToken;

    public void clearAll(){
        facebookAccessToken = null;
        userName = null;
        userId = null;
        authToken = null;
    }

    public String getFacebookAccessToken() {
        return facebookAccessToken;
    }

    public void setFacebookAccessToken(String facebookAccessToken) {
        this.facebookAccessToken = facebookAccessToken;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getAuthToken() {
        return authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;
    }
}
