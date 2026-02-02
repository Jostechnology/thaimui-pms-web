import { KTIcon } from "../../_metronic/helpers";

interface SearchProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    setKeyword: (value: string) => void;
    placeholer? : string
}

function SearchComponent(props: SearchProps) {

    const {
        searchTerm,
        setSearchTerm,
        setKeyword,
        placeholer
    } = props;


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setKeyword(searchTerm);
        }
    };

    return (
       
        <div className="input-group">
            <input
                type="text"
                className="form-control form-control-solid" 
                placeholder={placeholer ? placeholer : "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button
                className="btn btn-light"
                type="button"
                onClick={() => setKeyword(searchTerm)}
            >
                <KTIcon iconName="magnifier" className="fs-3" />
            </button>
        </div>
    )
}

export default SearchComponent;