import ApiError from "../utils/ApiError.js";

function isNumeric(str) {
  return /^[0-9]+$/.test(str);
}

const checkValidPrompt = (req, res, next) => {
  const userInput = req.body;

  // Check if input exists
  if (!userInput) {
    throw new ApiError(404, "Write something");
  }

  // Check if input is numeric
  if (isNumeric(userInput)) {
    res.status(202).send("Is this your pincode?");
    return; // Ensure no further execution after sending a response
  }

  // If input is valid but not numeric, continue to the next middleware or route
  next();
};

export { checkValidPrompt };
