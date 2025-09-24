import {useState} from 'react';
import {Model} from 'flexlayout-react';
import {loadLayout, saveLayout} from '@/features/layoutManager';
import defaultLayout from '@/features/defaultLayout';

const useLayoutModel = () => {
    const [model, setModel] = useState(() => Model.fromJson(loadLayout(defaultLayout)));

    const onModelChange = (newModel) => {
        saveLayout(newModel);
        setModel(newModel);
    };

    return {model, onModelChange};
};

export default useLayoutModel;
