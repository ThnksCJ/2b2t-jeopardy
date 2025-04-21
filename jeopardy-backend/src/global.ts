import {Logger} from 'sitka';

export namespace logger {
    export const global = Logger.getLogger({name: "JB", format: '[${LEVEL}] [${NAME}] ${MESSAGE}'});
}
