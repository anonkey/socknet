import _ArgTypes from './argTypes';

export default class CoreMiddleware {

	core(socket, event, clientArgs) {
		if (!this.validateClientArgs(event, clientArgs)) return;

		this.socket = socket;
		const clientCallback = clientArgs[1];

		if (event.before) {
			return this.beforeEvent(event, clientArgs)
		}

		event.fnPtr(socket, clientArgs[0], (...args) => {
			const err = args[0];
			if (err) {
				return clientCallback(err);
			}
			if (event.after) {
				const argsWithouErr = args.splice(1, args.length);
				return this.afterEvent(event, argsWithouErr, clientCallback);
			}
			clientCallback(...args);
		});
	}

	beforeEvent(event, clientArgs) {
		const requestArgs = clientArgs[0];
		const clientCallback = clientArgs[1];

		event.before(this.socket, requestArgs, (err) => {
			if (err) {
				/*
				**	TODO
				**	LOGGER
				*/
				return clientCallback(err);
			}
			event.fnPtr(this.socket, requestArgs, (...args) => {
				const err = args[0];
				if (err) {
					return clientCallback(err);
				}
				if (event.after) {
					const argsWithouErr = args.splice(1, args.length);
					return this.afterEvent(event, argsWithouErr, clientCallback);
				}
				clientCallback(...args);
			});
		});
	}

	afterEvent(event, args, clientCallback) {
		event.after(this.socket, ...args, (...args) => {
			const err = args[0];
			if (err) {
				/**
				* TODO LOGGER
				**/
				return clientCallback(err);
			}
			clientCallback(...args);
		});
	}

	/*
	** Client request is an array and is must be defined like this
	** first index is and object with the definition of the request
	** second index is the callback is the config required a return
	*/
	validateClientArgs({ fnPtr, config }, clientArgs) {
		let requestIsValid = true;
		const requestArgs = clientArgs[0];
		const clientCallback = clientArgs[1];

		if (config.return && typeof clientArgs[1] !== 'function') {
			// call logger //
			console.error(chalk.red(`Warning: request ${config.route} is called without callback`));
			requestIsValid = false;
			return requestIsValid;
		}

		if (config.args && !_ArgTypes.objectOf().validationFn(requestArgs)) {
			// console.error(chalk.red('Warning: request must be an object'));
			clientCallback({ code: 400, 'message': 'Bad Request', info: 'Argument object can\'t be null'});
			requestIsValid = false;
			return requestIsValid;
		}

		if (clientArgs.length < 2) {
			// console.error(chalk.red('Warning: client argument length is not valide'));
			requestIsValid = false;
			return requestIsValid;
		}

		Object.keys(config.args).forEach((key) => {
			const argConfig = config.args[key];
			if (!argConfig.validationFn(requestArgs[key])) {
				requestIsValid = false;
				clientCallback({
					code: 400,
					message: `Bad request ${key} must be ${argConfig.errorMessage}`,
					targetKey: key,
				});
			}
		});

		return requestIsValid;
	}

}