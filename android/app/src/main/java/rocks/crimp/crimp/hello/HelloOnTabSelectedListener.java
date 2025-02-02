package rocks.crimp.crimp.hello;

import android.support.design.widget.TabLayout;
import android.support.v4.view.PagerAdapter;

/**
 * @author Lin Weizhi (ecc.weizhi@gmail.com)
 */
public class HelloOnTabSelectedListener implements TabLayout.OnTabSelectedListener{
    private final HelloViewPager mViewPager;
    private final TabLayout mTabLayout;

    public HelloOnTabSelectedListener(HelloViewPager viewPager, TabLayout tabLayout) {
        mViewPager = viewPager;
        this.mTabLayout = tabLayout;
    }

    @Override
    public void onTabSelected(TabLayout.Tab tab) {
        PagerAdapter adapter = mViewPager.getAdapter();

        if(adapter instanceof HelloFragmentAdapter){
            int tabPosition = tab.getPosition();
            int mask = 1 << tabPosition;
            int canDisplay = ((HelloFragmentAdapter) adapter).getCanDisplay() & mask;
            if(canDisplay != 0){
                mViewPager.setCurrentItem(tab.getPosition());
            }
            else{
                TabLayout.Tab prevTab = mTabLayout.getTabAt(mViewPager.getCurrentItem());
                if(prevTab != null) prevTab.select();
            }
        }
        else{
            mViewPager.setCurrentItem(tab.getPosition());
        }
    }

    @Override
    public void onTabUnselected(TabLayout.Tab tab) {
        // No-op
    }

    @Override
    public void onTabReselected(TabLayout.Tab tab) {
        // No-op
    }
}
