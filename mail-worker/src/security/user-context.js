const userContext = {
	getUserId(c) {
		return c.get('user').userId;
	},

	getUser(c) {
		return c.get('user');
	},

	getToken(c) {
		return c.get('token');
	},
};
export default userContext;
