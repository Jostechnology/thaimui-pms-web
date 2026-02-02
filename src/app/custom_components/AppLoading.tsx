import { useAppLoading } from "../context/AppLoadingContext";

const AppLoading = () => {

    const { isLoading } = useAppLoading();
    const loadingContent = !isLoading ? null : (
        <>
            <div className="loading-backdrop"></div>
            <div className="loader-container">
                <div className="loader"></div>
            </div>
        </>
    )

    return (
        <>{loadingContent}</>
    );
}


export default AppLoading;