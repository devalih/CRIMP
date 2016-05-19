package rocks.crimp.crimp.network.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

/**
 * @author Lin Weizhi (ecc.weizhi@gmail.com)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class RequestBodyJs implements Serializable{
    @JsonIgnore
    private static final Long serialVersionUID = 1L;

    @JsonProperty("fb_user_id")
    private String fbUserId;
    @JsonProperty("fb_access_token")
    private String fbAccessToken;
    @JsonProperty("sequential_token")
    private long sequentialToken;

    @JsonProperty("force_login")
    private boolean forceLogin;
    @JsonProperty("forceReport")
    private boolean forceReport;

    @JsonProperty("score_string")
    private String scoreString;
    @JsonProperty("category_id")
    private Long categoryId;
    @JsonProperty("route_id")
    private Long routeId;
    @JsonProperty("climber_id")
    private Long climberId;
    @JsonProperty("marker_id")
    private String markerId;

    public String getFbUserId() {
        return fbUserId;
    }

    public void setFbUserId(String fbUserId) {
        this.fbUserId = fbUserId;
    }

    public String getFbAccessToken() {
        return fbAccessToken;
    }

    public void setFbAccessToken(String fbAccessToken) {
        this.fbAccessToken = fbAccessToken;
    }

    public long getSequentialToken() {
        return sequentialToken;
    }

    public void setSequentialToken(long sequentialToken) {
        this.sequentialToken = sequentialToken;
    }

    public boolean isForceLogin() {
        return forceLogin;
    }

    public void setForceLogin(boolean forceLogin) {
        this.forceLogin = forceLogin;
    }

    public boolean isForceReport() {
        return forceReport;
    }

    public void setForceReport(boolean forceReport) {
        this.forceReport = forceReport;
    }

    public String getScoreString() {
        return scoreString;
    }

    public void setScoreString(String scoreString) {
        this.scoreString = scoreString;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public Long getRouteId() {
        return routeId;
    }

    public void setRouteId(Long routeId) {
        this.routeId = routeId;
    }

    public Long getClimberId() {
        return climberId;
    }

    public void setClimberId(Long climberId) {
        this.climberId = climberId;
    }

    public String getMarkerId() {
        return markerId;
    }

    public void setMarkerId(String markerId) {
        this.markerId = markerId;
    }
}
