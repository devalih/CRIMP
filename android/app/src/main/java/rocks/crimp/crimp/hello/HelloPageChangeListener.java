package rocks.crimp.crimp.hello;

import android.support.design.widget.TabLayout;
import android.support.v4.view.ViewPager;
import android.view.View;

import java.lang.ref.WeakReference;

import rocks.crimp.crimp.CrimpApplication;
import rocks.crimp.crimp.common.event.SwipeTo;
import timber.log.Timber;

import static android.support.v4.view.ViewPager.SCROLL_STATE_DRAGGING;
import static android.support.v4.view.ViewPager.SCROLL_STATE_IDLE;
import static android.support.v4.view.ViewPager.SCROLL_STATE_SETTLING;

/**
 * @author Lin Weizhi (ecc.weizhi@gmail.com)
 */
public class HelloPageChangeListener implements ViewPager.OnPageChangeListener{
    private final WeakReference<TabLayout> mTabLayoutRef;
    private int mPreviousScrollState;
    private int mScrollState;

    public HelloPageChangeListener(TabLayout tabLayout) {
        mTabLayoutRef = new WeakReference<>(tabLayout);
    }

    @Override
    public void onPageScrolled(int position, float positionOffset, int positionOffsetPixels) {
        final TabLayout tabLayout = mTabLayoutRef.get();
        if (tabLayout != null) {
            // Only update the text selection if we're not settling, or we are settling after
            // being dragged
            final boolean updateText = mScrollState != SCROLL_STATE_SETTLING ||
                    mPreviousScrollState == SCROLL_STATE_DRAGGING;
            // Update the indicator if we're not settling after being idle. This is caused
            // from a setCurrentItem() call and will be handled by an animation from
            // onPageSelected() instead.
            final boolean updateIndicator = !(mScrollState == SCROLL_STATE_SETTLING
                    && mPreviousScrollState == SCROLL_STATE_IDLE);
            tabLayout.setScrollPosition(position, positionOffset, updateText);
        }
    }

    @Override
    public void onPageSelected(int position) {
        /* Note to self: when this method is called, the ViewPager.getCurrentItem() is already
         * returning the parameter position. Therefore we should be careful not to have a loop
         * and call ViewPager.setCurrentItem(int) again.
         */
        CrimpApplication.getBusInstance().post(new SwipeTo(position));
        Timber.d("onPageSelected: %d", position);
        final TabLayout tabLayout = mTabLayoutRef.get();
        if (tabLayout != null && tabLayout.getSelectedTabPosition() != position) {
            // Select the tab, only updating the indicator if we're not being dragged/settled
            // (since onPageScrolled will handle that).
            final boolean updateIndicator = mScrollState == SCROLL_STATE_IDLE
                    || (mScrollState == SCROLL_STATE_SETTLING
                    && mPreviousScrollState == SCROLL_STATE_IDLE);
            TabLayout.Tab tab = tabLayout.getTabAt(position);
            if(tab != null) tab.select();
            //tabLayout.selectTab(tabLayout.getTabAt(position), updateIndicator);
        }

        // We want to decide whether to show tab badge. First try to get a reference to custom view
        TabLayout.Tab scoreTab = tabLayout != null ?
                tabLayout.getTabAt(HelloFragmentAdapter.SCORE_TAB_POSITION) : null;
        View customView = scoreTab != null ? scoreTab.getCustomView() : null;
        TabViewHolder holder = customView != null ? (TabViewHolder) customView.getTag() : null;

        // Find out if we have currentScore in score tab
        String currentScore = CrimpApplication.getAppState()
                .getString(CrimpApplication.CURRENT_SCORE, null);
        if(currentScore != null && currentScore.length()>0 ){
            // We have currentScore. Set badge visibility base on which tab we are in.
            if(position != HelloFragmentAdapter.SCORE_TAB_POSITION){
                if(holder!=null && holder.tabBadge!=null){
                    holder.tabBadge.setVisibility(View.VISIBLE);
                }
            }
            else{
                if(holder!=null && holder.tabBadge!=null){
                    holder.tabBadge.setVisibility(View.INVISIBLE);
                }
            }
        }
        else{
            // We have no currentScore. No need to show badge.
            if(holder!=null && holder.tabBadge!=null){
                holder.tabBadge.setVisibility(View.INVISIBLE);
            }
        }
    }

    @Override
    public void onPageScrollStateChanged(int state) {
        mPreviousScrollState = mScrollState;
        mScrollState = state;
    }
}