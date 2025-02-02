package rocks.crimp.crimp.service;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.widget.Toast;

import java.util.UUID;

import rocks.crimp.crimp.CrimpApplication;
import rocks.crimp.crimp.R;
import rocks.crimp.crimp.common.event.RequestFailed;
import rocks.crimp.crimp.common.event.RequestSucceed;
import rocks.crimp.crimp.network.model.ErrorJs;
import timber.log.Timber;

/**
 * @author Lin Weizhi (ecc.weizhi@gmail.com)
 */
public class RestHandler extends Handler implements RestRequestTask.Callback{
    public static final int AWAIT = 1;
    public static final int DO_WORK = 2;
    public static final int FETCH_LOCAL = 3;

    private RestRequestTaskQueue mRestRequestTaskQueue;
    private boolean isExecutingTask;
    private Context mContext;

    public RestHandler(Looper looper, Context context){
        super(looper);
        mContext = context;
        mRestRequestTaskQueue = RestRequestTaskQueue.create();
    }

    @Override
    public void handleMessage(Message msg){
        switch(msg.what){
            case DO_WORK:
                Timber.d("DO_WORK message");
                executeTask();
                break;

            case FETCH_LOCAL:
                Intent intent = (Intent) msg.obj;
                UUID txId = (UUID) intent.getSerializableExtra(CrimpService.SERIALIZABLE_UUID);
                Timber.d("FETCH_LOCAL message. txId: %s", txId);

                Object value = CrimpApplication.getLocalModel().fetch(txId.toString(), Object.class);
                if(value != null){
                    // We have data in our local model.
                    CrimpApplication.getBusInstance().post(new RequestSucceed(txId, value));
                    tryAndQuitService();
                }
                else{
                    // We do not have data in our local model.
                    mRestRequestTaskQueue.add(new RestRequestTask(intent));
                    executeTask();
                }
                break;

            default:
                Timber.d("Unknown message");
        }
    }

    public int getThreadTaskCount(){
        return mRestRequestTaskQueue.size();
    }

    private void tryAndQuitService(){
        int totalTaskCount = CrimpApplication.getScoreHandler().getThreadTaskCount() +
                mRestRequestTaskQueue.size();
        if(totalTaskCount == 0) {
            Timber.d("Tried to stop service");
            Intent stopServiceIntent = new Intent(mContext, CrimpService.class);
            mContext.stopService(stopServiceIntent);
        }
    }

    private void executeTask(){
        if(isExecutingTask){
            return;
        }

        int queueSize = mRestRequestTaskQueue.size();
        Timber.d("executeTask(). queueSize: %d", queueSize);
        if(queueSize != 0){
            RestRequestTask task = mRestRequestTaskQueue.peek();
            if (task != null) {
                isExecutingTask = true;

                // Determine network connection. Execute task only if there is network.
                ConnectivityManager cm =
                        (ConnectivityManager)mContext.getSystemService(Context.CONNECTIVITY_SERVICE);
                NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
                boolean isConnected = activeNetwork != null &&
                        activeNetwork.isConnectedOrConnecting();

                if(isConnected){
                    task.execute(this);
                }
                else{
                    Toast toast = Toast.makeText(mContext,
                            mContext.getString(R.string.toast_no_network), Toast.LENGTH_SHORT);
                    toast.show();

                    isExecutingTask = false;
                    onRestFailure(task.getTxId(), null);
                }
            }
            else{
                throw new NullPointerException("We can't deserialize task");
            }
        }
        else{
            tryAndQuitService();
        }
    }

    @Override
    public void onRestSuccess(UUID txId, Object response) {
        isExecutingTask = false;
        mRestRequestTaskQueue.remove();
        CrimpApplication.getBusInstance().post(new RequestSucceed(txId, response));

        Message msg = this.obtainMessage(DO_WORK);
        this.sendMessage(msg);
    }

    @Override
    public void onRestFailure(UUID txId, ErrorJs errorJs) {
        isExecutingTask = false;
        mRestRequestTaskQueue.remove();
        CrimpApplication.getBusInstance().post(new RequestFailed(txId, errorJs));

        Message msg = this.obtainMessage(DO_WORK);
        this.sendMessage(msg);
    }
}
