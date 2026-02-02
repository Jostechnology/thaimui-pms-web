import { createContext, useState, ReactNode, Dispatch, SetStateAction, useContext } from "react"

interface AppLoadingProps {
    children: ReactNode;
}

interface AppLoadingContextType {
    isLoading: boolean;
    setLoading: () => void;
    setUnLoading: () => void;
}

const AppLoadingContext = createContext<AppLoadingContextType>({
    isLoading: false,
    setLoading: () => {},
    setUnLoading: () => {}
})

export const AppLoadingProvider = ({ children }: AppLoadingProps) => {
    const [isLoading, setIsLoading] = useState(false);

    const setLoading = () => setIsLoading(true);
    const setUnLoading = () => setIsLoading(false);

    return (
        <AppLoadingContext.Provider value={({
            isLoading, setLoading, setUnLoading
        })}>
            {children}
        </AppLoadingContext.Provider>
    );
}

export const useAppLoading = () => {
    return useContext(AppLoadingContext);
}