import { Suspense, FC, lazy } from "react";
import { WithChildren } from "../../_metronic/helpers";
import TopBarProgress from "react-topbar-progress-indicator";

const SuspenseComponent: FC<WithChildren> = ({children}) => {
    return (
        <Suspense fallback={<TopBarProgress/>}>
            {children}
        </Suspense>
    );
}

export default SuspenseComponent;