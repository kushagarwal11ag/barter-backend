## Models

1. UserModel
    id (Primary Key)
    username
    email
    passwordHash
    refreshToken (Optional: consider storing this in a separate table for better security)
    createdAt
    updatedAt
    profilePictureUrl (Optional)
    bio (Optional)
    Access control fields like role or permissions could be added for more granular access control.

2. ItemModel (for items users want to barter)
    id (Primary Key)
    ownerId (Foreign Key to UserModel)
    title
    description
    category
    condition (new, used, etc.)
    imagesUrl (Array or separate model to handle multiple images)
    status (available, pending, traded)
    createdAt
    updatedAt

3. TradeModel (to manage trade offers between users)
    id (Primary Key)
    itemOfferedId (Foreign Key to ItemModel)
    itemRequestedId (Foreign Key to ItemModel)
    status (pending, accepted, declined, cancelled)
    initiatedByUserId (Foreign Key to UserModel)
    respondedByUserId (Foreign Key to UserModel, nullable)
    createdAt
    updatedAt

4. MessageModel (if implementing a chat feature for negotiation)
    id (Primary Key)
    senderId (Foreign Key to UserModel)
    receiverId (Foreign Key to UserModel)
    content
    status (sent, delivered, read)
    createdAt

5. ReviewModel (to allow users to review each other post-trade)
    id (Primary Key)
    reviewerId (Foreign Key to UserModel)
    revieweeId (Foreign Key to UserModel)
    rating (e.g., 1 to 5)
    comment
    tradeId (Foreign Key to TradeModel, optional)
    createdAt

userModel.js – Defines the UserModel schema and its methods.
itemModel.js – Defines the ItemModel schema.
tradeModel.js – Defines the TradeModel schema.
messageModel.js – Defines the MessageModel schema for chat functionality.
reviewModel.js – Defines the ReviewModel schema for user reviews.

## Controllers
UserController
ProductController
WishlistController
TransactionController
MessageController
NotificationController
FeedbackController
SearchController

Middleware
authMiddleware.js – Handles authentication and authorization.
errorMiddleware.js – Global error handler for catching and responding to errors.
rateLimitMiddleware.js – Implements rate limiting to prevent abuse.
validationMiddleware.js – Validates requests based on predefined schemas.

Routes
userRoutes.js – Routes related to user operations (e.g., /register, /login).
itemRoutes.js – Routes for item management (e.g., /items/add, /items/update).
tradeRoutes.js – Routes for trade operations (e.g., /trades/initiate, /trades/respond).
messageRoutes.js – Routes for messaging functionality.
reviewRoutes.js – Routes for handling reviews.

Utils
db.js – Utility for database connection and configuration.
hashUtil.js – Utility functions for hashing (e.g., passwords).
tokenUtil.js – Handles creation and verification of JWT tokens.
responseUtil.js – Utility for standardizing API responses.
validationUtil.js – Utility functions for request validation.