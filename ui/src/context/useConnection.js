import {useContext} from 'react';
import {ConnectionContext} from './ConnectionContext';

export const useConnection = () => useContext(ConnectionContext);