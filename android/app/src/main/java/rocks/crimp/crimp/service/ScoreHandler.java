package rocks.crimp.crimp.service;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;

import com.squareup.otto.Produce;

import java.util.UUID;

import rocks.crimp.crimp.CrimpApplication;
import rocks.crimp.crimp.common.event.CurrentUploadTask;
import rocks.crimp.crimp.common.event.RequestFailed;
import rocks.crimp.crimp.common.event.RequestSucceed;
import rocks.crimp.crimp.network.model.RequestBean;
import timber.log.Timber;

/**
 * @author Lin Weizhi (ecc.weizhi@gmail.com)
 */
public class ScoreHandler extends Handler implements ScoreUploadTask.Callback{
    public static final int AWAIT = 1;
    public static final int DO_WORK = 2;
    public static final int NEW_UPLOAD = 3;

    private volatile ScoreUploadTaskQueue mScoreUploadTaskQueue;
    private boolean isExecutingTask;
    private Context mContext;

    public ScoreHandler(Looper looper, Context context){
        super(looper);
        mContext = context;
        mScoreUploadTaskQueue = ScoreUploadTaskQueue.create(context);
        CrimpApplication.getBusInstance().register(this);
    }

    @Produce
    public CurrentUploadTask produceCurrentUploadTask(){
        int count = mScoreUploadTaskQueue.size();
        RequestBean task = null;
        if(count>0){
            task = mScoreUploadTaskQueue.peek().getRequestBean();
        }
        return new CurrentUploadTask(mScoreUploadTaskQueue.size(), task, "nothing");
    }

    @Override
    public void handleMessage(Message msg){
        switch(msg.what){
            case DO_WORK:
                Timber.d("DO_WORK message");
                executeTask();
                break;

            case NEW_UPLOAD:
                Timber.d("NEW_TASK message");
                Intent intent = (Intent) msg.obj;
                if(intent == null){
                    throw new NullPointerException("ScoreHandler message should include obj field");
                }
                mScoreUploadTaskQueue.add(new ScoreUploadTask(intent));
                Message newMsg = this.obtainMessage(DO_WORK);
                this.sendMessage(newMsg);
                break;

            default:
                Timber.d("unknown message");
        }
    }

    private void executeTask(){
        if(isExecutingTask){
            return;
        }

        int queueSize = mScoreUploadTaskQueue.size();
        Timber.d("executeTask(). queueSize: %d", queueSize);
        if(queueSize != 0){
            ScoreUploadTask task = mScoreUploadTaskQueue.peek();

            CrimpApplication.getBusInstance()
                    .post(new CurrentUploadTask(queueSize, task.getRequestBean(), "nothing"));

            if (task != null) {
                isExecutingTask = true;
                task.execute(this);
            }
            else{
                throw new NullPointerException("We can't deserialize task");
            }
        }
        else{
            CrimpApplication.getBusInstance()
                    .post(new CurrentUploadTask(queueSize, null, "nothing"));
            tryAndQuitService();
        }
    }

    public int getThreadTaskCount(){
        return mScoreUploadTaskQueue.size();
    }


    private void tryAndQuitService(){
        int totalTaskCount = CrimpApplication.getRestHandler().getThreadTaskCount() +
                mScoreUploadTaskQueue.size();
        if(totalTaskCount == 0) {
            Timber.d("Tried to stop service");
            Intent stopServiceIntent = new Intent(mContext, CrimpService.class);
            mContext.stopService(stopServiceIntent);
        }
    }


    @Override
    public void onScoreUploadSuccess(UUID txId, Object response) {
        isExecutingTask = false;
        mScoreUploadTaskQueue.remove();
        CrimpApplication.getBusInstance().post(new RequestSucceed(txId, response));

        Message msg = this.obtainMessage(DO_WORK);
        this.sendMessage(msg);
    }

    @Override
    public void onScoreUploadFailure(UUID txId) {
        isExecutingTask = false;
        mScoreUploadTaskQueue.remove();
        CrimpApplication.getBusInstance().post(new RequestFailed(txId));

        Message msg = this.obtainMessage(DO_WORK);
        this.sendMessage(msg);
    }
}
