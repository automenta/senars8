import {useContext} from 'react';
import {SharedStateContext} from './SharedStateContext';

export const useSharedState = () => useContext(SharedStateContext);